import { NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/admin-auth";
import prisma from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  const session = getAdminSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { ticketId } = await params;
  const body: unknown = await req.json();

  const mode =
    typeof body === "object" && body !== null && "mode" in body
      ? (body as { mode?: unknown }).mode
      : "assign";
  const assignee =
    typeof body === "object" && body !== null && "assignee" in body
      ? (body as { assignee?: unknown }).assignee
      : session.name;

  const ticket = await prisma.ticket.findFirst({
    where: {
      OR: [{ id: ticketId }, { code: ticketId }],
    },
    select: { id: true },
  });

  if (!ticket) {
    return NextResponse.json(
      { error: "Ticket not found" },
      { status: 404 }
    );
  }

  const unassign = mode === "unassign";
  const targetAssignee =
    !unassign && typeof assignee === "string" && assignee.trim()
      ? assignee.trim()
      : session.name;

  const updated = await prisma.ticket.update({
    where: { id: ticket.id },
    data: {
      assignedAdminId: unassign ? null : targetAssignee,
      assignedAt: unassign ? null : new Date(),
    },
  });

  return NextResponse.json(updated);
}
