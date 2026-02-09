import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: { ticketId: string } }
) {

  const { ticketId } = params;
  const body = await req.json();

  const { sender, message } = body;

  if (!sender || !message) {
    return NextResponse.json(
      { error: "sender & message required" },
      { status: 400 }
    );
  }
const ticket = await prisma.ticket.findUnique({
  where: { id: ticketId },
  select: { status: true },
});

if (ticket?.status === "CLOSED") {
  return NextResponse.json(
    { error: "Ticket already closed" },
    { status: 403 }
  );
}

  const savedMessage = await prisma.ticketMessage.create({
    data: {
      ticketId,
      sender,
      message,
    },
  });

  if (sender === "admin") {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { firstReplyAt: true },
    });

    if (!ticket?.firstReplyAt) {
      await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          firstReplyAt: new Date(),
          status: "IN_PROGRESS",
        },
      });
    }
  }

  return NextResponse.json(savedMessage);
}
