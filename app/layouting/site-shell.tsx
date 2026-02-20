"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Toaster } from "sonner";
import { SimpleNavbar } from "@/app/layouting/user-layout";

type TicketStatus = "OPEN" | "IN_PROGRESS" | "WAITING" | "CLOSED";
type PersistedChatState = {
  ticketId: string;
};

const LAST_CHAT_STORAGE_KEY = "hd_last_chat_state";

export function SiteShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [hasActiveChat, setHasActiveChat] = useState(false);

  useEffect(() => {
    const loadActiveChat = async () => {
      try {
        const raw = localStorage.getItem(LAST_CHAT_STORAGE_KEY);
        if (!raw) {
          setHasActiveChat(false);
          return;
        }

        const parsed = JSON.parse(raw) as Partial<PersistedChatState>;
        if (!parsed.ticketId) {
          setHasActiveChat(false);
          return;
        }

        const res = await fetch(`/api/tickets/${parsed.ticketId}`);
        if (!res.ok) {
          setHasActiveChat(false);
          return;
        }

        const ticket = (await res.json()) as {
          status?: TicketStatus;
          feedbackRating?: number | null;
        };
        setHasActiveChat(
          ticket.status === "OPEN" ||
            ticket.status === "IN_PROGRESS" ||
            ticket.status === "WAITING" ||
            (ticket.status === "CLOSED" && ticket.feedbackRating == null)
        );
      } catch {
        setHasActiveChat(false);
      }
    };

    void loadActiveChat();
  }, [pathname]);

  const activePage = useMemo(() => {
    if (pathname === "/") return "home";
    if (pathname === "/ticket" || pathname === "/create") return "create";
    if (pathname === "/dashboard") return "dashboard";
    return "home";
  }, [pathname]);

  const onNavigate = (page: string) => {
    if (page === "home") {
      router.push("/");
      return;
    }
    if (page === "create") {
      router.push("/ticket");
      return;
    }
    if (page === "dashboard") {
      router.push("/dashboard");
      return;
    }
  };

  return (
    <div className={isDarkMode ? "dark" : ""}>
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 selection:bg-blue-100 dark:selection:bg-blue-900 transition-colors duration-300">
        <Toaster
          position="top-center"
          richColors
          theme={isDarkMode ? "dark" : "light"}
        />
        <SimpleNavbar
          onNavigate={onNavigate}
          activePage={activePage}
          isDarkMode={isDarkMode}
          toggleDarkMode={() => setIsDarkMode((prev) => !prev)}
          hasActiveChat={hasActiveChat}
          onResumeChat={() => router.push("/chat")}
        />

        <main className="w-full flex-1">
          <div className="max-w-6xl mx-auto px-6 py-12">{children}</div>
        </main>

        <footer className="max-w-6xl w-full mx-auto px-6 py-12 border-t border-slate-100 dark:border-slate-900">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2 grayscale opacity-50 dark:opacity-30">
              <div className="w-6 h-6 bg-slate-800 dark:bg-slate-200 rounded flex items-center justify-center">
                <span className="text-white dark:text-slate-900 text-[10px] font-bold">
                  IT
                </span>
              </div>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Internal HelpDesk Portal
              </span>
            </div>
            <p className="text-sm text-slate-400 dark:text-slate-500">
              © 2026 IT Operations Team. All rights reserved.
            </p>
            <div className="flex gap-6">
              <a
                href="#"
                className="text-xs font-semibold text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                Kebijakan Privasi
              </a>
              <a
                href="#"
                className="text-xs font-semibold text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                Panduan Pengguna
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
