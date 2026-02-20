import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { publishAdminEvent } from "@/lib/realtime";

const REPORTER_COOKIE = "hd_reporter_key";
const REPORTER_META_PREFIX = "reporter:";
const REPORTER_NAME_META_PREFIX = "reporter_name:";
const REPORTER_META_SENDER = "system";

function generateTicketCode() {
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `TIC-${rand}`;
}

function parseCookie(req: Request, name: string) {
  const raw = req.headers.get("cookie");
  if (!raw) return null;
  const parts = raw.split(";").map((item) => item.trim());
  for (const part of parts) {
    if (!part.startsWith(`${name}=`)) continue;
    return decodeURIComponent(part.slice(name.length + 1));
  }
  return null;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const pageParam = Number(searchParams.get("page") || "1");
    const limitParam = Number(searchParams.get("limit") || "5");
    const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;
    const limit =
      Number.isFinite(limitParam) && limitParam > 0
        ? Math.min(Math.floor(limitParam), 20)
        : 5;

    const [total, tickets] = await Promise.all([
      prisma.ticket.count(),
      prisma.ticket.findMany({
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          code: true,
          title: true,
          status: true,
          category: true,
          createdAt: true,
        },
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return NextResponse.json({
      items: tickets,
      page,
      limit,
      total,
      totalPages,
    });
  } catch (error) {
    console.error("Failed to load tickets:", error);
    return NextResponse.json(
      { error: "Failed to load tickets" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const body = await req.json();

  const { title, description, priority, category, reporterName } = body;

  if (!title || !description || !priority || !category) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const normalizedReporterName =
    typeof reporterName === "string" && reporterName.trim()
      ? reporterName.trim()
      : "Pelapor";

  const existingReporterKey = parseCookie(req, REPORTER_COOKIE);
  const reporterKey = existingReporterKey || crypto.randomUUID();

  const latestReporterTicket = await prisma.ticket.findFirst({
    where: {
      messages: {
        some: {
          sender: REPORTER_META_SENDER,
          message: `${REPORTER_META_PREFIX}${reporterKey}`,
        },
      },
    },
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      code: true,
      status: true,
      feedbackRating: true,
    },
  });

  const shouldBlockCreate =
    latestReporterTicket &&
    (latestReporterTicket.status === "OPEN" ||
      latestReporterTicket.status === "IN_PROGRESS" ||
      latestReporterTicket.status === "WAITING" ||
      (latestReporterTicket.status === "CLOSED" &&
        latestReporterTicket.feedbackRating == null));

  if (shouldBlockCreate && latestReporterTicket) {
    const blocked = NextResponse.json(
      {
        error:
          "Masih ada tiket yang belum ditindaklanjuti. Selesaikan tiket aktif atau beri feedback tiket yang sudah selesai sebelum membuat tiket baru.",
        activeTicketCode: latestReporterTicket.code,
        activeTicketId: latestReporterTicket.id,
        activeTicketStatus: latestReporterTicket.status,
      },
      { status: 409 }
    );
    blocked.headers.set(
      "Set-Cookie",
      `${REPORTER_COOKIE}=${encodeURIComponent(
        reporterKey
      )}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax`
    );
    return blocked;
  }

  // 1. Fetch SLA policy by priority
  const sla = await prisma.slaPolicy.findFirst({
    where: {
      priority,
      active: true,
    },
  });

  if (!sla) {
    return NextResponse.json(
      { error: "SLA policy not found" },
      { status: 500 }
    );
  }

  const now = new Date();

  // 2. Calculate SLA deadlines
  const responseDueAt = new Date(
    now.getTime() + sla.responseMinutes * 60 * 1000
  );

  const resolveDueAt = new Date(
    now.getTime() + sla.resolveMinutes * 60 * 1000
  );

  // 3. Create ticket
  try {
    const ticket = await prisma.$transaction(async (tx) => {
      const created = await tx.ticket.create({
        data: {
          code: generateTicketCode(),
          title,
          description,
          priority,
          category,
          responseDueAt,
          resolveDueAt,
        },
      });

      await tx.ticketMessage.create({
        data: {
          ticketId: created.id,
          sender: REPORTER_META_SENDER,
          message: `${REPORTER_META_PREFIX}${reporterKey}`,
        },
      });

      await tx.ticketMessage.create({
        data: {
          ticketId: created.id,
          sender: REPORTER_META_SENDER,
          message: `${REPORTER_NAME_META_PREFIX}${normalizedReporterName}`,
        },
      });

      return created;
    });
    publishAdminEvent({
      id: `ticket_created:${ticket.id}`,
      type: "ticket_created",
      ticketId: ticket.id,
      ticketCode: ticket.code,
      title: ticket.title,
      message: "Tiket baru masuk",
      createdAt: ticket.createdAt.toISOString(),
    });
    const response = NextResponse.json(ticket);
    response.headers.set(
      "Set-Cookie",
      `${REPORTER_COOKIE}=${encodeURIComponent(
        reporterKey
      )}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax`
    );
    return response;
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to create ticket" },
      { status: 500 }
    );
  }
}
