import { NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/admin-auth";
import prisma from "@/lib/prisma";
import { deriveTicketSlaState } from "@/lib/sla";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  const session = getAdminSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { ticketId } = await params;

  const ticket = await prisma.ticket.findFirst({
    where: {
      OR: [{ id: ticketId }, { code: ticketId }],
    },
    include: {
      messages: {
        where: {
          sender: { in: ["user", "admin"] },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!ticket) {
    return NextResponse.json(
      { error: "Ticket not found" },
      { status: 404 }
    );
  }

  const reporterMeta = await prisma.ticketMessage.findFirst({
    where: {
      ticketId: ticket.id,
      sender: "system",
      message: {
        startsWith: "reporter_name:",
      },
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      message: true,
    },
  });
  const reporterName = reporterMeta?.message
    ? reporterMeta.message.replace(/^reporter_name:/, "").trim()
    : null;

  const unreadUserMessages = await prisma.ticketMessage.count({
    where: {
      ticketId: ticket.id,
      sender: "user",
      createdAt: ticket.lastAdminReadAt
        ? { gt: ticket.lastAdminReadAt }
        : undefined,
    },
  });

  return NextResponse.json({
    ...ticket,
    reporterName,
    unreadUserMessages,
    isAssignedToMe: ticket.assignedAdminId === session.name,
    ...deriveTicketSlaState({
      status: ticket.status,
      firstReplyAt: ticket.firstReplyAt,
      responseDueAt: ticket.responseDueAt,
      resolveDueAt: ticket.resolveDueAt,
    }),
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  const session = getAdminSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { ticketId } = await params;
  const body: unknown = await req.json();
  const status =
    typeof body === "object" && body !== null && "status" in body
      ? (body as { status?: unknown }).status
      : undefined;

  const allowed = new Set(["OPEN", "IN_PROGRESS", "WAITING", "CLOSED"]);
  if (typeof status !== "string" || !allowed.has(status)) {
    return NextResponse.json(
      { error: "Valid status is required" },
      { status: 400 }
    );
  }

  const ticket = await prisma.ticket.findFirst({
    where: {
      OR: [{ id: ticketId }, { code: ticketId }],
    },
    select: { id: true },
  });

  if (!ticket) {
    return NextResponse.json(
      { error: "Ticket not found" },
      { status: 404 }
    );
  }

  const updated = await prisma.ticket.update({
    where: { id: ticket.id },
    data: {
      status: status as "OPEN" | "IN_PROGRESS" | "WAITING" | "CLOSED",
      closedAt: status === "CLOSED" ? new Date() : null,
      assignedAdminId: session.name,
      assignedAt: new Date(),
    },
  });

  return NextResponse.json(updated);
}
