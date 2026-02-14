import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  const { ticketId } = await params;

  const ticket = await prisma.ticket.findFirst({
    where: {
      OR: [{ id: ticketId }, { code: ticketId }],
    },
    select: {
      id: true,
      status: true,
      feedbackRating: true,
      feedbackSubmittedAt: true,
    },
  });

  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  if (ticket.status === "CLOSED") {
    return NextResponse.json(
      {
        id: ticket.id,
        status: ticket.status,
        feedbackRating: ticket.feedbackRating,
        feedbackSubmittedAt: ticket.feedbackSubmittedAt,
      },
      { status: 200 }
    );
  }

  const updated = await prisma.ticket.update({
    where: { id: ticket.id },
    data: {
      status: "CLOSED",
      closedAt: new Date(),
    },
    select: {
      id: true,
      status: true,
      feedbackRating: true,
      feedbackSubmittedAt: true,
      closedAt: true,
    },
  });

  return NextResponse.json(updated, { status: 200 });
}
