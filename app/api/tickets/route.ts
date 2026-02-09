import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  console.log("HIT")
  const body = await req.json();
  console.log("BODY:", body);

  const { title, description, priority, category } = body;

  if (!title || !description || !priority || !category) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  // 1. Fetch SLA policy by priority
  const sla = await prisma.slaPolicy.findFirst({
    where: {
      priority,
      active: true,
    },
  });

  if (!sla) {
    return NextResponse.json(
      { error: "SLA policy not found" },
      { status: 500 }
    );
  }

  const now = new Date();

  // 2. Calculate SLA deadlines
  const responseDueAt = new Date(
    now.getTime() + sla.responseMinutes * 60 * 1000
  );

  const resolveDueAt = new Date(
    now.getTime() + sla.resolveMinutes * 60 * 1000
  );

  // 3. Create ticket
  try {
    const ticket = await prisma.ticket.create({
      data: {
      title,
      description,
      priority,
      category,
      responseDueAt,
      resolveDueAt,
    },
  });
    return NextResponse.json(ticket);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to create ticket" },
      { status: 500 }
    );
  }
}