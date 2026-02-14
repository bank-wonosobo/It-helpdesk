import { getAdminSessionFromRequest } from "@/lib/admin-auth";
import prisma from "@/lib/prisma";
import { AdminRealtimeEvent, subscribeAdminEvents } from "@/lib/realtime";
import { deriveTicketSlaState } from "@/lib/sla";

export const runtime = "nodejs";

const encoder = new TextEncoder();

const toSseMessage = (event: string, data: unknown) =>
  encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

export async function GET(req: Request) {
  const session = getAdminSessionFromRequest(req);
  if (!session) {
    return new Response("unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const afterParam = searchParams.get("after");
  let lastCursor =
    afterParam && !Number.isNaN(Date.parse(afterParam))
      ? new Date(afterParam)
      : new Date(0);

  const emitted = new Set<string>();
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let unsubscribe: (() => void) | null = null;
  let fallbackPoll: ReturnType<typeof setInterval> | null = null;

  const emitEvent = (
    controller: ReadableStreamDefaultController<Uint8Array>,
    event: AdminRealtimeEvent
  ) => {
    if (emitted.has(event.id)) return;
    emitted.add(event.id);
    controller.enqueue(toSseMessage("notification", event));
    const eventDate = new Date(event.createdAt);
    if (!Number.isNaN(eventDate.getTime()) && eventDate > lastCursor) {
      lastCursor = eventDate;
    }
  };

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(toSseMessage("connected", { ok: true }));

      const emitSlaBreachEvents = async () => {
        const tickets = await prisma.ticket.findMany({
          where: {
            status: { not: "CLOSED" },
          },
          select: {
            id: true,
            code: true,
            title: true,
            status: true,
            firstReplyAt: true,
            responseDueAt: true,
            resolveDueAt: true,
          },
          take: 300,
        });

        for (const ticket of tickets) {
          const sla = deriveTicketSlaState({
            status: ticket.status,
            firstReplyAt: ticket.firstReplyAt,
            responseDueAt: ticket.responseDueAt,
            resolveDueAt: ticket.resolveDueAt,
          });

          if (!sla.isSlaBreached) continue;

          if (sla.isResponseBreached) {
            emitEvent(controller, {
              id: `sla_breach:response:${ticket.id}`,
              type: "sla_breach",
              ticketId: ticket.id,
              ticketCode: ticket.code,
              title: ticket.title,
              message: "SLA respons terlewati.",
              createdAt: new Date().toISOString(),
            });
          }

          if (sla.isResolveBreached) {
            emitEvent(controller, {
              id: `sla_breach:resolve:${ticket.id}`,
              type: "sla_breach",
              ticketId: ticket.id,
              ticketCode: ticket.code,
              title: ticket.title,
              message: "SLA penyelesaian terlewati.",
              createdAt: new Date().toISOString(),
            });
          }
        }
      };

      const [recentTickets, recentMessages] = await Promise.all([
        prisma.ticket.findMany({
          where: { createdAt: { gt: lastCursor } },
          orderBy: { createdAt: "asc" },
          select: { id: true, code: true, title: true, createdAt: true },
          take: 100,
        }),
        prisma.ticketMessage.findMany({
          where: {
            sender: "user",
            createdAt: { gt: lastCursor },
          },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            message: true,
            createdAt: true,
            ticket: {
              select: {
                id: true,
                code: true,
                title: true,
              },
            },
          },
          take: 200,
        }),
      ]);

      for (const ticket of recentTickets) {
        emitEvent(controller, {
          id: `ticket_created:${ticket.id}`,
          type: "ticket_created",
          ticketId: ticket.id,
          ticketCode: ticket.code,
          title: ticket.title,
          message: "Tiket baru masuk",
          createdAt: ticket.createdAt.toISOString(),
        });
      }

      for (const message of recentMessages) {
        emitEvent(controller, {
          id: `user_message:${message.id}`,
          type: "user_message",
          ticketId: message.ticket.id,
          ticketCode: message.ticket.code,
          title: message.ticket.title,
          message: message.message,
          createdAt: message.createdAt.toISOString(),
        });
      }

      await emitSlaBreachEvents();

      heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(": ping\n\n"));
      }, 20000);

      unsubscribe = subscribeAdminEvents((event) => {
        emitEvent(controller, event);
      });

      fallbackPoll = setInterval(async () => {
        try {
          const [newTickets, newMessages] = await Promise.all([
            prisma.ticket.findMany({
              where: { createdAt: { gt: lastCursor } },
              orderBy: { createdAt: "asc" },
              select: { id: true, code: true, title: true, createdAt: true },
              take: 50,
            }),
            prisma.ticketMessage.findMany({
              where: {
                sender: "user",
                createdAt: { gt: lastCursor },
              },
              orderBy: { createdAt: "asc" },
              select: {
                id: true,
                message: true,
                createdAt: true,
                ticket: {
                  select: {
                    id: true,
                    code: true,
                    title: true,
                  },
                },
              },
              take: 100,
            }),
          ]);

          for (const ticket of newTickets) {
            emitEvent(controller, {
              id: `ticket_created:${ticket.id}`,
              type: "ticket_created",
              ticketId: ticket.id,
              ticketCode: ticket.code,
              title: ticket.title,
              message: "Tiket baru masuk",
              createdAt: ticket.createdAt.toISOString(),
            });
          }

          for (const message of newMessages) {
            emitEvent(controller, {
              id: `user_message:${message.id}`,
              type: "user_message",
              ticketId: message.ticket.id,
              ticketCode: message.ticket.code,
              title: message.ticket.title,
              message: message.message,
              createdAt: message.createdAt.toISOString(),
            });
          }

          await emitSlaBreachEvents();
        } catch {
          // Ignore transient polling errors.
        }
      }, 4000);
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat);
      if (unsubscribe) unsubscribe();
      if (fallbackPoll) clearInterval(fallbackPoll);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
