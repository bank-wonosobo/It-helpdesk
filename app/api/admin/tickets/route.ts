import { Prisma } from "@/app/generated/prisma/client";
import { NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/admin-auth";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  const session = getAdminSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const pageParam = Number(searchParams.get("page") || "1");
    const limitParam = Number(searchParams.get("limit") || "10");
    const statusParam = searchParams.get("status");
    const queryParam = (searchParams.get("q") || "").trim();
    const assignedParam = searchParams.get("assigned");

    const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;
    const limit =
      Number.isFinite(limitParam) && limitParam > 0
        ? Math.min(Math.floor(limitParam), 30)
        : 10;

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

    const [total, tickets] = await Promise.all([
      prisma.ticket.count({ where }),
      prisma.ticket.findMany({
        where,
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          code: true,
          title: true,
          description: true,
          status: true,
          category: true,
          priority: true,
          createdAt: true,
          updatedAt: true,
          assignedAdminId: true,
          assignedAt: true,
          lastAdminReadAt: true,
        },
      }),
    ]);

    const items = await Promise.all(
      tickets.map(async (ticket) => {
        const unreadUserMessages = await prisma.ticketMessage.count({
          where: {
            ticketId: ticket.id,
            sender: "user",
            createdAt: ticket.lastAdminReadAt
              ? { gt: ticket.lastAdminReadAt }
              : undefined,
          },
        });

        return {
          ...ticket,
          unreadUserMessages,
          isAssignedToMe: ticket.assignedAdminId === session.name,
        };
      })
    );

    return NextResponse.json({
      items,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    console.error("Failed to load admin tickets:", error);
    return NextResponse.json(
      { error: "Failed to load admin tickets" },
      { status: 500 }
    );
  }
}
