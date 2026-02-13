import { NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/admin-auth";
import prisma from "@/lib/prisma";
import { publishAdminEvent, publishTicketMessage } from "@/lib/realtime";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ ticketId: string }> }
) {
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

  return NextResponse.json(ticket.messages);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  const { ticketId } = await params;
  const body: unknown = await req.json();

  const sender =
    typeof body === "object" && body !== null && "sender" in body
      ? (body as { sender?: unknown }).sender
      : undefined;
  const message =
    typeof body === "object" && body !== null && "message" in body
      ? (body as { message?: unknown }).message
      : undefined;

  if (
    (sender !== "user" && sender !== "admin") ||
    typeof message !== "string" ||
    !message.trim()
  ) {
    return NextResponse.json(
      { error: "sender and non-empty message are required" },
      { status: 400 }
    );
  }

  const adminSession = sender === "admin" ? getAdminSessionFromRequest(req) : null;
  if (sender === "admin" && !adminSession) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401 }
    );
  }

  const ticket = await prisma.ticket.findFirst({
    where: {
      OR: [{ id: ticketId }, { code: ticketId }],
    },
  });

  if (!ticket) {
    return NextResponse.json(
      { error: "Ticket not found" },
      { status: 404 }
    );
  }

  const newMessage = await prisma.ticketMessage.create({
    data: {
      ticketId: ticket.id,
      sender,
      message: message.trim(),
    },
  });

  if (sender === "admin" && !ticket.firstReplyAt) {
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        firstReplyAt: new Date(),
        status: ticket.status === "OPEN" ? "IN_PROGRESS" : ticket.status,
        assignedAdminId: adminSession?.name || ticket.assignedAdminId,
        assignedAt: adminSession ? new Date() : ticket.assignedAt,
        lastAdminReadAt: new Date(),
      },
    });
  }

  if (sender === "admin" && ticket.firstReplyAt) {
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        status: ticket.status === "OPEN" ? "IN_PROGRESS" : ticket.status,
        assignedAdminId: adminSession?.name || ticket.assignedAdminId,
        assignedAt: adminSession ? new Date() : ticket.assignedAt,
        lastAdminReadAt: new Date(),
      },
    });
  }

  if (sender === "user" && ticket.status === "CLOSED") {
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        status: "IN_PROGRESS",
        closedAt: null,
      },
    });
  }

  publishTicketMessage(ticket.id, newMessage);
  if (sender === "user") {
    publishAdminEvent({
      id: `user_message:${newMessage.id}`,
      type: "user_message",
      ticketId: ticket.id,
      ticketCode: ticket.code,
      title: ticket.title,
      message: newMessage.message,
      createdAt: newMessage.createdAt.toISOString(),
    });
  }

  return NextResponse.json(newMessage, { status: 201 });
}
