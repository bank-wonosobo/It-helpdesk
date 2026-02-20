"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SimpleNavbar } from "@/app/layouting/user-layout";
import { LandingPage } from "@/app/landing-page/page";
import { TicketForm } from "@/app/ticket/ticket-form";
import { DashboardView } from "@/app/dashboard/page";
import { ChatPage } from "@/app/chat/page";
import { AdminDashboard } from "@/app/admin/page";
import { Toaster } from "sonner";

type RecentTicket = {
  id: string;
  code: string;
  title: string;
  status: "OPEN" | "IN_PROGRESS" | "WAITING" | "CLOSED";
  category: "HARDWARE" | "SOFTWARE" | "NETWORK" | "ACCOUNT" | "OTHER";
  createdAt: string;
};

type RecentTicketsResponse = {
  items: RecentTicket[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type ActiveTicketData = {
  name: string;
  location: string;
  title: string;
  category: string;
  urgency: string;
  detail: string;
};

type PersistedChatState = {
  ticketId: string;
  ticketData: ActiveTicketData | null;
};

const LAST_CHAT_STORAGE_KEY = "hd_last_chat_state";

const formatStatusLabel = (status: RecentTicket["status"]) => {
  switch (status) {
    case "CLOSED":
      return "Selesai";
    case "OPEN":
    case "IN_PROGRESS":
      return "Proses";
    case "WAITING":
      return "Menunggu";
    default:
      return "Proses";
  }
};

const formatCategoryLabel = (category: RecentTicket["category"]) => {
  switch (category) {
    case "HARDWARE":
      return "Hardware";
    case "SOFTWARE":
      return "Software";
    case "NETWORK":
      return "Jaringan";
    case "ACCOUNT":
      return "Akun";
    case "OTHER":
      return "Lainnya";
    default:
      return "Lainnya";
  }
};

export default function App() {
    const router = useRouter();
    const [currentPage, setCurrentPage] = useState("home");
    const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
    const [activeTicketStatus, setActiveTicketStatus] = useState<
      "OPEN" | "IN_PROGRESS" | "WAITING" | "CLOSED" | null
    >(null);
    const [activeTicketData, setActiveTicketData] = useState<ActiveTicketData | null>(null);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [recentTickets, setRecentTickets] = useState<RecentTicket[]>([]);
    const [isRecentLoading, setIsRecentLoading] = useState(false);
    const [recentError, setRecentError] = useState<string | null>(null);
    const [recentPage, setRecentPage] = useState(1);
    const [recentTotalPages, setRecentTotalPages] = useState(1);
    
    useEffect(() => {
        if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
            setIsDarkMode(false);
        }

        try {
          const raw = localStorage.getItem(LAST_CHAT_STORAGE_KEY);
          if (!raw) return;

          const parsed = JSON.parse(raw) as Partial<PersistedChatState>;
          if (typeof parsed.ticketId === "string" && parsed.ticketId) {
            setActiveTicketId(parsed.ticketId);
            setActiveTicketData(parsed.ticketData ?? null);
          }
        } catch {
          // Ignore invalid localStorage payload.
        }
    }, []);

    useEffect(() => {
      if (!activeTicketId) return;

      const payload: PersistedChatState = {
        ticketId: activeTicketId,
        ticketData: activeTicketData,
      };
      localStorage.setItem(LAST_CHAT_STORAGE_KEY, JSON.stringify(payload));
    }, [activeTicketId, activeTicketData]);

    const persistChatState = (ticketId: string, ticketData: ActiveTicketData | null) => {
      const payload: PersistedChatState = { ticketId, ticketData };
      localStorage.setItem(LAST_CHAT_STORAGE_KEY, JSON.stringify(payload));
    };

    useEffect(() => {
      if (!activeTicketId) {
        setActiveTicketStatus(null);
        return;
      }

      const loadActiveTicketStatus = async () => {
        try {
          const res = await fetch(`/api/tickets/${activeTicketId}`);
          if (!res.ok) {
            setActiveTicketStatus(null);
            return;
          }

          const ticket = (await res.json()) as { status?: unknown };
          if (
            ticket.status === "OPEN" ||
            ticket.status === "IN_PROGRESS" ||
            ticket.status === "WAITING" ||
            ticket.status === "CLOSED"
          ) {
            setActiveTicketStatus(ticket.status);
            return;
          }

          setActiveTicketStatus(null);
        } catch {
          setActiveTicketStatus(null);
        }
      };

      loadActiveTicketStatus();
    }, [activeTicketId, currentPage]);

    useEffect(() => {
      if (currentPage !== "dashboard") return;

      const loadRecentTickets = async () => {
        setIsRecentLoading(true);
        setRecentError(null);

        try {
          const res = await fetch(`/api/tickets?page=${recentPage}&limit=5`);
          const data: unknown = await res.json();

          if (!res.ok) {
            const apiError =
              typeof data === "object" &&
              data !== null &&
              "error" in data &&
              typeof (data as { error?: unknown }).error === "string"
                ? (data as { error: string }).error
                : "Gagal memuat laporan terbaru.";
            setRecentError(apiError);
            setRecentTickets([]);
            return;
          }

          if (typeof data !== "object" || data === null) {
            setRecentError("Format data laporan terbaru tidak valid.");
            setRecentTickets([]);
            return;
          }

          const payload = data as Partial<RecentTicketsResponse>;

          if (
            !Array.isArray(payload.items) ||
            typeof payload.page !== "number" ||
            typeof payload.totalPages !== "number"
          ) {
            setRecentError("Format data laporan terbaru tidak valid.");
            setRecentTickets([]);
            return;
          }

          const parsed = payload.items.filter((item): item is RecentTicket => {
            if (typeof item !== "object" || item === null) return false;
            const row = item as Partial<RecentTicket>;
            return (
              typeof row.id === "string" &&
              typeof row.code === "string" &&
              typeof row.title === "string" &&
              typeof row.createdAt === "string" &&
              (row.status === "OPEN" ||
                row.status === "IN_PROGRESS" ||
                row.status === "WAITING" ||
                row.status === "CLOSED") &&
              (row.category === "HARDWARE" ||
                row.category === "SOFTWARE" ||
                row.category === "NETWORK" ||
                row.category === "ACCOUNT" ||
                row.category === "OTHER")
            );
          });

          setRecentTickets(parsed);
          setRecentTotalPages(payload.totalPages > 0 ? payload.totalPages : 1);
        } catch {
          setRecentError("Terjadi kendala jaringan saat memuat laporan.");
          setRecentTickets([]);
        } finally {
          setIsRecentLoading(false);
        }
      };

      loadRecentTickets();
    }, [currentPage, recentPage]);

    const toggleDarkMode = () => setIsDarkMode(!isDarkMode);
    const hasActiveChat = Boolean(
      activeTicketId && activeTicketStatus && activeTicketStatus !== "CLOSED"
    );

    const navigateTo = (page: string) => {
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
      if (page === "admin") {
        router.push("/admin");
        return;
      }
      if (page === "chat") {
        router.push("/chat");
        return;
      }
      setCurrentPage(page);
    };

    const openActiveChat = () => {
      if (!activeTicketId) return;
      router.push("/chat");
    };

    const renderContent = () => {
        switch (currentPage) {
            case "home":
                return (
                <LandingPage 
                    onCreateClick={() => router.push("/ticket")}
                    onDashboardClick={() => router.push("/dashboard")}
                    onGuideClick={() => router.push("/panduan")}
                    onResumeChat={openActiveChat}
                    hasActiveChat={hasActiveChat}
                />
                );
      case "create":
        return (
          <TicketForm 
            onBack={() => setCurrentPage("home")}
            onSuccess={(id, data) => {
              setActiveTicketId(id);
              setActiveTicketData(data);
              persistChatState(id, data);
              router.push("/chat");
            }}
          />
        );
      case "chat":
        return (
          <ChatPage 
            ticketId={activeTicketId || "TIC-XXXX"} 
            ticketData={activeTicketData || { name: 'User', title: 'Kendala IT', location: '-', category: '-', urgency: '-' }}
            onBack={() => setCurrentPage("home")} 
          />
        );
      case "dashboard":
        return (
          <div className="space-y-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Dashboard Publik</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Transparansi layanan IT kami untuk semua karyawan.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button 
                  onClick={() => router.push("/ticket")}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                >
                  Buat Laporan Baru
                </button>
                <button
                  onClick={() => router.push("/admin")}
                  className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-300/30 dark:bg-slate-700 dark:hover:bg-slate-600 dark:shadow-black/30 active:scale-95"
                >
                  Mode Admin
                </button>
              </div>
            </div>
            <DashboardView />
            
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-800 dark:text-white mb-4">Laporan Terbaru</h3>
              <div className="space-y-4">
                {isRecentLoading && (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Memuat laporan terbaru...
                  </p>
                )}
                {recentError && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {recentError}
                  </p>
                )}
                {!isRecentLoading && !recentError && recentTickets.length === 0 && (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Belum ada laporan.
                  </p>
                )}
                {!isRecentLoading &&
                  !recentError &&
                  recentTickets.map((item) => (
                  (() => {
                    const statusLabel = formatStatusLabel(item.status);
                    return (
                  <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-lg flex items-center justify-center font-bold text-slate-400 dark:text-slate-500 text-xs border border-slate-100 dark:border-slate-700">
                        {item.code}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-100">{item.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {formatCategoryLabel(item.category)} •{" "}
                          {new Date(item.createdAt).toLocaleDateString("id-ID", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                    <span className={`self-start sm:self-center text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                      statusLabel === 'Selesai' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20' : 
                      statusLabel === 'Proses' ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-500/20' : 
                      'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-500/20'
                    }`}>
                      {statusLabel.toUpperCase()}
                    </span>
                  </div>
                    );
                  })()
                ))}
                {!recentError && (
                  <div className="pt-2 flex items-center justify-between gap-3">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Halaman {recentPage} dari {recentTotalPages}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setRecentPage((prev) => Math.max(1, prev - 1))}
                        disabled={isRecentLoading || recentPage <= 1}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        Sebelumnya
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setRecentPage((prev) =>
                            Math.min(recentTotalPages, prev + 1)
                          )
                        }
                        disabled={isRecentLoading || recentPage >= recentTotalPages}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        Berikutnya
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      case "admin":
        return <AdminDashboard onBackHome={() => setCurrentPage("home")} />;
      default:
        return <LandingPage 
          onCreateClick={() => router.push("/ticket")}
          onDashboardClick={() => router.push("/dashboard")}
          onGuideClick={() => router.push("/panduan")}
          onResumeChat={openActiveChat}
          hasActiveChat={hasActiveChat}
        />;
    }
  };

  return (
    <div className={isDarkMode ? "dark" : ""}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 selection:bg-blue-100 dark:selection:bg-blue-900 transition-colors duration-300">
        <Toaster position="top-center" richColors theme={isDarkMode ? "dark" : "light"} />
        <SimpleNavbar 
          onNavigate={navigateTo} 
          activePage={currentPage} 
          isDarkMode={isDarkMode}
          toggleDarkMode={toggleDarkMode}
          hasActiveChat={hasActiveChat}
          onResumeChat={openActiveChat}
        />
        
        <main className="max-w-6xl mx-auto px-6 py-12">
          {renderContent()}
        </main>

        <footer className="max-w-6xl mx-auto px-6 py-12 border-t border-slate-100 dark:border-slate-900 mt-20">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2 grayscale opacity-50 dark:opacity-30">
              <div className="w-6 h-6 bg-slate-800 dark:bg-slate-200 rounded flex items-center justify-center">
                <span className="text-white dark:text-slate-900 text-[10px] font-bold">IT</span>
              </div>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Internal HelpDesk Portal</span>
            </div>
            <p className="text-sm text-slate-400 dark:text-slate-500">© 2026 IT Operations Team. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#" className="text-xs font-semibold text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Kebijakan Privasi</a>
              <a href="#" className="text-xs font-semibold text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Panduan Pengguna</a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
