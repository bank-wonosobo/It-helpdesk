import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(
  req: Request,
  context: { params: Promise<{ ticketId: string }> }
) {
  const { ticketId } = await context.params;
  const body = await req.json();
  const { sender, message } = body;

  if (!sender || !message) {
    return NextResponse.json(
      { error: "sender & message required" },
      { status: 400 }
    );
  }

  const ticket = await prisma.ticket.findUnique({
    where: {code: ticketId},
    select: {id:true, status: true, firstReplyAt: true },
  });

  if (!ticket) {
    return NextResponse.json(
      { error: "Ticket not found" },
      { status: 404 }
    );
  }

  if (ticket.status === "CLOSED") {
    return NextResponse.json(
      { error: "Ticket already closed" },
      { status: 403 }
    );
  }

  const savedMessage = await prisma.ticketMessage.create({
    data: {
      ticketId: ticket.id,
      sender,
      message,
    },
  });

  if (sender === "admin" && !ticket.firstReplyAt) {
    await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        firstReplyAt: new Date(),
        status: "IN_PROGRESS",
      },
    });
  }

  return NextResponse.json(savedMessage);
}

export async function GET(
  req: Request,
  context: { params: Promise<{ ticketId: string }> }
) {
  const { ticketId } = await context.params;

  const messages = await prisma.ticketMessage.findMany({
    where: { ticketId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(messages);
}
