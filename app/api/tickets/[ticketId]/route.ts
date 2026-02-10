import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  req: Request,
  context: { params: Promise<{ ticketId: string }> }
) {
  const { ticketId } = await context.params;

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      status: true,
    },
  });

  if (!ticket) {
    return NextResponse.json(
      { error: "Ticket not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(ticket);
}
