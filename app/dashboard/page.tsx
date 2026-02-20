"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ArrowUpRight 
} from "lucide-react";

type DashboardStats = {
  cards: {
    completed: number;
    inProgress: number;
    needsAttention: number;
  };
  weeklyVolume: Array<{ name: string; tickets: number }>;
  statusBreakdown: Array<{ name: string; value: number; color: string }>;
};

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

const DEFAULT_STATS: DashboardStats = {
  cards: {
    completed: 0,
    inProgress: 0,
    needsAttention: 0,
  },
  weeklyVolume: [
    { name: "Sen", tickets: 0 },
    { name: "Sel", tickets: 0 },
    { name: "Rab", tickets: 0 },
    { name: "Kam", tickets: 0 },
    { name: "Jum", tickets: 0 },
    { name: "Sab", tickets: 0 },
    { name: "Min", tickets: 0 },
  ],
  statusBreakdown: [
    { name: "Selesai", value: 0, color: "#10b981" },
    { name: "Proses", value: 0, color: "#3b82f6" },
    { name: "Tertunda", value: 0, color: "#f59e0b" },
  ],
};

const parseDashboardStats = (value: unknown): DashboardStats | null => {
  if (typeof value !== "object" || value === null) return null;

  const candidate = value as Partial<DashboardStats>;
  if (
    !candidate.cards ||
    typeof candidate.cards.completed !== "number" ||
    typeof candidate.cards.inProgress !== "number" ||
    typeof candidate.cards.needsAttention !== "number" ||
    !Array.isArray(candidate.weeklyVolume) ||
    !Array.isArray(candidate.statusBreakdown)
  ) {
    return null;
  }

  return candidate as DashboardStats;
};

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

export const DashboardView = () => {
  const [stats, setStats] = useState<DashboardStats>(DEFAULT_STATS);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      setLoading(true);
      setErrorMessage(null);

      try {
        const res = await fetch("/api/dashboard/stats");
        const data: unknown = await res.json();

        if (!res.ok) {
          const fallbackError =
            typeof data === "object" &&
            data !== null &&
            "error" in data &&
            typeof (data as { error?: unknown }).error === "string"
              ? (data as { error: string }).error
              : "Gagal memuat statistik layanan.";
          setErrorMessage(fallbackError);
          return;
        }

        const parsed = parseDashboardStats(data);
        if (!parsed) {
          setErrorMessage("Format data statistik tidak valid.");
          return;
        }

        setStats(parsed);
      } catch {
        setErrorMessage("Terjadi kendala jaringan saat memuat statistik.");
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  const cards = useMemo(
    () => [
      {
        label: "Tiket Selesai",
        value: String(stats.cards.completed).padStart(2, "0"),
        icon: CheckCircle2,
        color: "text-emerald-600 dark:text-emerald-400",
        bg: "bg-emerald-50 dark:bg-emerald-500/10",
      },
      {
        label: "Dalam Proses",
        value: String(stats.cards.inProgress).padStart(2, "0"),
        icon: Clock,
        color: "text-blue-600 dark:text-blue-400",
        bg: "bg-blue-50 dark:bg-blue-500/10",
      },
      {
        label: "Butuh Perhatian",
        value: String(stats.cards.needsAttention).padStart(2, "0"),
        icon: AlertCircle,
        color: "text-amber-600 dark:text-amber-400",
        bg: "bg-amber-50 dark:bg-amber-500/10",
      },
    ],
    [stats]
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
          {errorMessage}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((stat, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                <stat.icon className="size-6" />
              </div>
              <span className="flex items-center text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-full">
                {loading ? "..." : "Live"} <ArrowUpRight className="size-3 ml-0.5" />
              </span>
            </div>
            <div className="mt-4">
              <p className="text-3xl font-bold text-slate-800 dark:text-white">{stat.value}</p>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
          <h3 className="font-semibold text-slate-800 dark:text-white mb-6">Volume Tiket Mingguan</h3>
          <div className="h-64 w-full min-h-[256px] min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={256}>
              <BarChart data={stats.weeklyVolume}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.1} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: "#94a3b8", fontSize: 12 }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: "#94a3b8", fontSize: 12 }} 
                />
                <Tooltip 
                  cursor={{ fill: "rgba(148, 163, 184, 0.1)" }}
                  contentStyle={{ 
                    backgroundColor: "rgb(15, 23, 42)", 
                    border: "1px solid rgb(30, 41, 59)", 
                    borderRadius: "8px", 
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    color: "#fff"
                  }}
                />
                <Bar dataKey="tickets" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
          <h3 className="font-semibold text-slate-800 dark:text-white mb-6">Status Penyelesaian</h3>
          <div className="h-64 w-full min-h-[256px] flex items-center gap-4">
            <div className="h-full min-w-0 flex-1">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={256}>
                <PieChart>
                  <Pie
                    data={stats.statusBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stats.statusBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-36 shrink-0 space-y-3 pr-2">
              {stats.statusBreakdown.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{item.name}</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 ml-auto">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function DashboardRoutePage() {
  const router = useRouter();
  const [recentTickets, setRecentTickets] = useState<RecentTicket[]>([]);
  const [isRecentLoading, setIsRecentLoading] = useState(false);
  const [recentError, setRecentError] = useState<string | null>(null);
  const [recentPage, setRecentPage] = useState(1);
  const [recentTotalPages, setRecentTotalPages] = useState(1);

  useEffect(() => {
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

    void loadRecentTickets();
  }, [recentPage]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
            Dashboard Publik
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Transparansi layanan IT kami untuk semua karyawan.
          </p>
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
        <h3 className="font-bold text-slate-800 dark:text-white mb-4">
          Laporan Terbaru
        </h3>
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
            recentTickets.map((item) => {
              const statusLabel = formatStatusLabel(item.status);
              return (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-lg flex items-center justify-center font-bold text-slate-400 dark:text-slate-500 text-xs border border-slate-100 dark:border-slate-700">
                      {item.code}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-100">
                        {item.title}
                      </p>
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
                  <span
                    className={`self-start sm:self-center text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                      statusLabel === "Selesai"
                        ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20"
                        : statusLabel === "Proses"
                        ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-500/20"
                        : "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-500/20"
                    }`}
                  >
                    {statusLabel.toUpperCase()}
                  </span>
                </div>
              );
            })}

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
                    setRecentPage((prev) => Math.min(recentTotalPages, prev + 1))
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
}
