import { Prisma } from "@/app/generated/prisma/client";
import { NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/admin-auth";
import prisma from "@/lib/prisma";

const csvEscape = (value: unknown) => {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (text.includes('"') || text.includes(",") || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

export async function GET(req: Request) {
  const session = getAdminSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status");
    const queryParam = (searchParams.get("q") || "").trim();
    const assignedParam = searchParams.get("assigned");

    const where: Prisma.TicketWhereInput = {};
    const allowedStatus = new Set(["OPEN", "IN_PROGRESS", "WAITING", "CLOSED"]);
    if (statusParam && allowedStatus.has(statusParam)) {
      where.status = statusParam as "OPEN" | "IN_PROGRESS" | "WAITING" | "CLOSED";
    }

    if (queryParam) {
      where.OR = [
        { code: { contains: queryParam, mode: "insensitive" } },
        { title: { contains: queryParam, mode: "insensitive" } },
        { description: { contains: queryParam, mode: "insensitive" } },
      ];
    }

    if (assignedParam === "me") {
      where.assignedAdminId = session.name;
    } else if (assignedParam === "unassigned") {
      where.assignedAdminId = null;
    }

    const tickets = await prisma.ticket.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      select: {
        code: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        category: true,
        assignedAdminId: true,
        createdAt: true,
        responseDueAt: true,
        resolveDueAt: true,
        firstReplyAt: true,
        closedAt: true,
      },
    });

    const headers = [
      "Code",
      "Title",
      "Description",
      "Status",
      "Priority",
      "Category",
      "Assigned",
      "Created At",
      "Response Due At",
      "Resolve Due At",
      "Response SLA Met",
      "Resolve SLA Met",
    ];

    const rows = tickets.map((ticket) => {
      const responseSlaMet = ticket.firstReplyAt
        ? ticket.firstReplyAt <= ticket.responseDueAt
          ? "YES"
          : "NO"
        : "PENDING";
      const resolveSlaMet = ticket.closedAt
        ? ticket.closedAt <= ticket.resolveDueAt
          ? "YES"
          : "NO"
        : "PENDING";

      return [
        ticket.code,
        ticket.title,
        ticket.description,
        ticket.status,
        ticket.priority,
        ticket.category,
        ticket.assignedAdminId || "",
        ticket.createdAt.toISOString(),
        ticket.responseDueAt.toISOString(),
        ticket.resolveDueAt.toISOString(),
        responseSlaMet,
        resolveSlaMet,
      ]
        .map(csvEscape)
        .join(",");
    });

    const csv = [headers.map(csvEscape).join(","), ...rows].join("\n");
    const filename = `ticket-report-${new Date().toISOString().slice(0, 10)}.csv`;

    return new Response(`\uFEFF${csv}`, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Failed to export admin report:", error);
    return NextResponse.json(
      { error: "Failed to export report" },
      { status: 500 }
    );
  }
}
