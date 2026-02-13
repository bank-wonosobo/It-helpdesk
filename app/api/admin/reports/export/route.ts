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
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            sender: true,
            createdAt: true,
          },
        },
      },
    });

    const headers = [
      "Ticket ID",
      "Code",
      "Title",
      "Description",
      "Status",
      "Priority",
      "Category",
      "Assigned Admin",
      "Created At",
      "Updated At",
      "Response Due At",
      "Resolve Due At",
      "First Reply At",
      "Closed At",
      "Total Messages",
      "User Messages",
      "Admin Messages",
      "Response SLA Met",
      "Resolve SLA Met",
    ];

    const rows = tickets.map((ticket) => {
      const totalMessages = ticket.messages.length;
      const userMessages = ticket.messages.filter((msg) => msg.sender === "user").length;
      const adminMessages = ticket.messages.filter((msg) => msg.sender === "admin").length;
      const responseSlaMet =
        ticket.firstReplyAt && ticket.firstReplyAt <= ticket.responseDueAt ? "YES" : "NO";
      const resolveSlaMet =
        ticket.closedAt && ticket.closedAt <= ticket.resolveDueAt ? "YES" : "NO";

      return [
        ticket.id,
        ticket.code,
        ticket.title,
        ticket.description,
        ticket.status,
        ticket.priority,
        ticket.category,
        ticket.assignedAdminId || "",
        ticket.createdAt.toISOString(),
        ticket.updatedAt.toISOString(),
        ticket.responseDueAt.toISOString(),
        ticket.resolveDueAt.toISOString(),
        ticket.firstReplyAt ? ticket.firstReplyAt.toISOString() : "",
        ticket.closedAt ? ticket.closedAt.toISOString() : "",
        totalMessages,
        userMessages,
        adminMessages,
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
