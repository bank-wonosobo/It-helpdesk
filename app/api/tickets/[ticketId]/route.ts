import { NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/admin-auth";
import prisma from "@/lib/prisma";

export async function GET(
  req: Request,
  context: { params: Promise<{ ticketId: string }> }
) {
  const { ticketId } = await context.params;
  const { searchParams } = new URL(req.url);
  const includeMessages = searchParams.get("includeMessages") === "1";

  const ticket = await prisma.ticket.findFirst({
    where: {
      OR: [{ id: ticketId }, { code: ticketId }],
    },
    include: includeMessages
      ? {
          messages: {
            where: {
              sender: { in: ["user", "admin"] },
            },
            orderBy: { createdAt: "asc" },
          },
        }
      : undefined,
  });

  if (!ticket) {
    return NextResponse.json(
      { error: "Ticket not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(ticket);
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ ticketId: string }> }
) {
  const session = getAdminSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { ticketId } = await context.params;
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

  const existing = await prisma.ticket.findFirst({
    where: {
      OR: [{ id: ticketId }, { code: ticketId }],
    },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Ticket not found" },
      { status: 404 }
    );
  }

  const updateData: {
    status: "OPEN" | "IN_PROGRESS" | "WAITING" | "CLOSED";
    closedAt?: Date | null;
    feedbackRating?: number | null;
    feedbackSubmittedAt?: Date | null;
  } = {
    status: status as "OPEN" | "IN_PROGRESS" | "WAITING" | "CLOSED",
  };

  updateData.closedAt = status === "CLOSED" ? new Date() : null;
  if (status !== "CLOSED") {
    updateData.feedbackRating = null;
    updateData.feedbackSubmittedAt = null;
  }

  const updated = await prisma.ticket.update({
    where: { id: existing.id },
    data: updateData,
  });

  return NextResponse.json(updated);
}
