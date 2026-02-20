"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TicketForm } from "@/app/ticket/ticket-form";
import { NoticeCard } from "@/app/components/system/ux";

type TicketStatus = "OPEN" | "IN_PROGRESS" | "WAITING" | "CLOSED";
type PersistedChatState = {
  ticketId: string;
  ticketData: {
    name: string;
    location: string;
    title: string;
    category: string;
    urgency: string;
    detail: string;
  };
};

const LAST_CHAT_STORAGE_KEY = "hd_last_chat_state";

export default function TicketPage() {
  const router = useRouter();
  const [gateState, setGateState] = useState<"checking" | "blocked" | "open">(
    "checking"
  );

  useEffect(() => {
    let mounted = true;

    const checkActiveTicket = async () => {
      try {
        const raw = localStorage.getItem(LAST_CHAT_STORAGE_KEY);
        if (!raw) {
          if (mounted) setGateState("open");
          return;
        }

        const parsed = JSON.parse(raw) as Partial<PersistedChatState>;
        if (!parsed.ticketId || typeof parsed.ticketId !== "string") {
          if (mounted) setGateState("open");
          return;
        }

        const res = await fetch(`/api/tickets/${parsed.ticketId}`);
        if (!res.ok) {
          localStorage.removeItem(LAST_CHAT_STORAGE_KEY);
          if (mounted) setGateState("open");
          return;
        }

        const ticket = (await res.json()) as {
          status?: TicketStatus;
          feedbackRating?: number | null;
        };
        const isBlocked =
          ticket.status === "OPEN" ||
          ticket.status === "IN_PROGRESS" ||
          ticket.status === "WAITING" ||
          (ticket.status === "CLOSED" && ticket.feedbackRating == null);

        if (mounted) setGateState(isBlocked ? "blocked" : "open");
      } catch {
        if (mounted) setGateState("open");
      }
    };

    void checkActiveTicket();
    return () => {
      mounted = false;
    };
  }, []);

  if (gateState === "checking") {
    return (
      <NoticeCard className="mx-auto max-w-2xl text-slate-500 dark:text-slate-300">
        Memeriksa status tiket aktif...
      </NoticeCard>
    );
  }

  if (gateState === "blocked") {
    return (
      <NoticeCard
        tone="warning"
        className="mx-auto max-w-2xl rounded-2xl p-6 shadow-sm"
      >
        <h2 className="text-lg font-bold text-amber-800 dark:text-amber-200">
          Anda masih punya tiket yang perlu ditindaklanjuti
        </h2>
        <p className="mt-2.5 text-sm leading-relaxed text-amber-700 dark:text-amber-300">
          Selesaikan tiket aktif terlebih dulu, atau kirim feedback untuk tiket yang baru ditutup, sebelum membuat tiket baru.
        </p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => router.push("/chat")}
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
          >
            Lanjutkan Chat Aktif
          </button>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100 dark:border-amber-400/40 dark:bg-amber-900/10 dark:text-amber-200 dark:hover:bg-amber-900/20"
          >
            Kembali
          </button>
        </div>
      </NoticeCard>
    );
  }

  return (
    <TicketForm
      onBack={() => router.push("/")}
      onSuccess={(ticketId, ticketData) => {
        const payload: PersistedChatState = { ticketId, ticketData };
        localStorage.setItem(LAST_CHAT_STORAGE_KEY, JSON.stringify(payload));
        router.push("/chat");
      }}
    />
  );
}
