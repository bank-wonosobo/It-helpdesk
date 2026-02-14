type TicketStatus = "OPEN" | "IN_PROGRESS" | "WAITING" | "CLOSED";

const DUE_SOON_MINUTES = 15;

export type TicketSlaInput = {
  status: TicketStatus;
  firstReplyAt: Date | null;
  responseDueAt: Date;
  resolveDueAt: Date;
};

export type TicketSlaDerived = {
  isResponseBreached: boolean;
  isResolveBreached: boolean;
  isSlaBreached: boolean;
  isResponseDueSoon: boolean;
  isResolveDueSoon: boolean;
  isSlaDueSoon: boolean;
  slaState: "BREACHED" | "DUE_SOON" | "ON_TRACK";
};

export const deriveTicketSlaState = (
  ticket: TicketSlaInput,
  now: Date = new Date()
): TicketSlaDerived => {
  const isClosed = ticket.status === "CLOSED";

  const isResponseBreached =
    !isClosed && !ticket.firstReplyAt && ticket.responseDueAt.getTime() < now.getTime();
  const isResolveBreached =
    !isClosed && ticket.resolveDueAt.getTime() < now.getTime();

  const responseMsLeft = ticket.responseDueAt.getTime() - now.getTime();
  const resolveMsLeft = ticket.resolveDueAt.getTime() - now.getTime();

  const isResponseDueSoon =
    !isClosed &&
    !ticket.firstReplyAt &&
    responseMsLeft >= 0 &&
    responseMsLeft <= DUE_SOON_MINUTES * 60 * 1000;
  const isResolveDueSoon =
    !isClosed &&
    resolveMsLeft >= 0 &&
    resolveMsLeft <= DUE_SOON_MINUTES * 60 * 1000;

  const isSlaBreached = isResponseBreached || isResolveBreached;
  const isSlaDueSoon = !isSlaBreached && (isResponseDueSoon || isResolveDueSoon);

  return {
    isResponseBreached,
    isResolveBreached,
    isSlaBreached,
    isResponseDueSoon,
    isResolveDueSoon,
    isSlaDueSoon,
    slaState: isSlaBreached ? "BREACHED" : isSlaDueSoon ? "DUE_SOON" : "ON_TRACK",
  };
};
