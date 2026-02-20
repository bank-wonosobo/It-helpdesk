import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  const { ticketId } = await params;
  const body: unknown = await req.json();
  const rating =
    typeof body === "object" && body !== null && "rating" in body
      ? (body as { rating?: unknown }).rating
      : undefined;

  if (typeof rating !== "number" || !Number.isInteger(rating)) {
    return NextResponse.json(
      { error: "rating integer 1-5 wajib diisi" },
      { status: 400 }
    );
  }

  if (rating < 1 || rating > 5) {
    return NextResponse.json(
      { error: "rating harus antara 1 sampai 5" },
      { status: 400 }
    );
  }

  const ticket = await prisma.ticket.findFirst({
    where: {
      OR: [{ id: ticketId }, { code: ticketId }],
    },
    select: {
      id: true,
      status: true,
      feedbackRating: true,
    },
  });

  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  if (ticket.status !== "CLOSED") {
    return NextResponse.json(
      { error: "Feedback hanya bisa dikirim saat tiket sudah selesai." },
      { status: 400 }
    );
  }

  if (ticket.feedbackRating !== null) {
    return NextResponse.json(
      { error: "Feedback untuk tiket ini sudah dikirim." },
      { status: 409 }
    );
  }

  const updated = await prisma.ticket.update({
    where: { id: ticket.id },
    data: {
      feedbackRating: rating,
      feedbackSubmittedAt: new Date(),
    },
    select: {
      id: true,
      code: true,
      feedbackRating: true,
      feedbackSubmittedAt: true,
    },
  });

  return NextResponse.json(updated, { status: 201 });
}
