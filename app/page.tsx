"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LandingPage } from "@/app/landing-page/page";

export default function Page() {
  const router = useRouter();
  const [hasActiveChat, setHasActiveChat] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadState = async () => {
      const raw = localStorage.getItem("hd_last_chat_state");
      if (!raw) return;

      try {
        const parsed = JSON.parse(raw) as { ticketId?: unknown };
        if (typeof parsed.ticketId !== "string" || !parsed.ticketId) return;

        const res = await fetch(`/api/tickets/${parsed.ticketId}`);
        if (!res.ok) return;

        const ticket = (await res.json()) as {
          status?: "OPEN" | "IN_PROGRESS" | "WAITING" | "CLOSED";
          feedbackRating?: number | null;
        };
        const active =
          ticket.status === "OPEN" ||
          ticket.status === "IN_PROGRESS" ||
          ticket.status === "WAITING" ||
          (ticket.status === "CLOSED" && ticket.feedbackRating == null);

        if (mounted) setHasActiveChat(active);
      } catch {
        // ignore local parsing/network errors
      }
    };

    void loadState();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <LandingPage
      onCreateClick={() => router.push("/ticket")}
      onDashboardClick={() => router.push("/dashboard")}
      onGuideClick={() => router.push("/panduan")}
      onResumeChat={() => router.push("/chat")}
      hasActiveChat={hasActiveChat}
    />
  );
}
