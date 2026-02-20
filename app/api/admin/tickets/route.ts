import { Prisma } from "@/app/generated/prisma/client";
import { NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/admin-auth";
import prisma from "@/lib/prisma";
import { deriveTicketSlaState } from "@/lib/sla";

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
    const categoryParam = searchParams.get("category");
    const urgencyParam = searchParams.get("urgency");

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

    const allowedCategory = new Set([
      "HARDWARE",
      "SOFTWARE",
      "NETWORK",
      "ACCOUNT",
      "OTHER",
    ]);
    if (categoryParam && allowedCategory.has(categoryParam)) {
      where.category = categoryParam as
        | "HARDWARE"
        | "SOFTWARE"
        | "NETWORK"
        | "ACCOUNT"
        | "OTHER";
    }

    const tickets = await prisma.ticket.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
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
        firstReplyAt: true,
        responseDueAt: true,
        resolveDueAt: true,
        assignedAdminId: true,
        assignedAt: true,
        lastAdminReadAt: true,
      },
    });

    const now = new Date();

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
          ...deriveTicketSlaState(
            {
              status: ticket.status,
              firstReplyAt: ticket.firstReplyAt,
              responseDueAt: ticket.responseDueAt,
              resolveDueAt: ticket.resolveDueAt,
            },
            now
          ),
        };
      })
    );

    const urgencyFiltered = items.filter((item) => {
      if (urgencyParam === "breached") return item.isSlaBreached;
      if (urgencyParam === "due_soon") return item.isSlaDueSoon;
      if (urgencyParam === "on_track") return !item.isSlaBreached && !item.isSlaDueSoon;
      return true;
    });

    const priorityRank: Record<"HIGH" | "MEDIUM" | "LOW", number> = {
      HIGH: 0,
      MEDIUM: 1,
      LOW: 2,
    };

    const sorted = urgencyFiltered.sort((a, b) => {
      const isNewA = a.status === "OPEN" ? 0 : 1;
      const isNewB = b.status === "OPEN" ? 0 : 1;
      if (isNewA !== isNewB) return isNewA - isNewB;

      if (a.status === "CLOSED" && b.status === "CLOSED") {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }

      const priorityDelta = priorityRank[a.priority] - priorityRank[b.priority];
      if (priorityDelta !== 0) return priorityDelta;

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const total = sorted.length;
    const pagedItems = sorted.slice((page - 1) * limit, page * limit);

    return NextResponse.json({
      items: pagedItems,
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
