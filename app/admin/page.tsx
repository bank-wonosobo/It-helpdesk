"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, RefreshCw, Send, Shield, Ticket, UserCheck } from "lucide-react";
import { toast } from "sonner";

type TicketStatus = "OPEN" | "IN_PROGRESS" | "WAITING" | "CLOSED";
type TicketCategory = "HARDWARE" | "SOFTWARE" | "NETWORK" | "ACCOUNT" | "OTHER";
type TicketPriority = "LOW" | "MEDIUM" | "HIGH";
type TicketSender = "user" | "admin";

type AdminTicketSummary = {
  id: string;
  code: string;
  title: string;
  description: string;
  status: TicketStatus;
  category: TicketCategory;
  priority: TicketPriority;
  createdAt: string;
  updatedAt: string;
  assignedAdminId: string | null;
  assignedAt: string | null;
  unreadUserMessages: number;
  isAssignedToMe: boolean;
};

type TicketMessage = {
  id: string;
  ticketId: string;
  sender: TicketSender | "system";
  message: string;
  createdAt: string;
};

type AdminTicketDetail = AdminTicketSummary & {
  reporterName?: string | null;
  firstReplyAt: string | null;
  responseDueAt: string;
  resolveDueAt: string;
  messages: TicketMessage[];
};

type AdminTicketListResponse = {
  items: AdminTicketSummary[];
  page: number;
  totalPages: number;
};

type AdminSessionResponse = {
  authenticated: boolean;
  user?: string;
  role?: string;
};

type AdminNotificationEvent = {
  id: string;
  type: "ticket_created" | "user_message";
  ticketId: string;
  ticketCode: string;
  title: string;
  message: string;
  createdAt: string;
};

const statusLabel: Record<TicketStatus, string> = {
  OPEN: "Baru",
  IN_PROGRESS: "Dikerjakan",
  WAITING: "Menunggu",
  CLOSED: "Selesai",
};

const statusBadgeClass: Record<TicketStatus, string> = {
  OPEN: "bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/20",
  IN_PROGRESS:
    "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20",
  WAITING:
    "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20",
  CLOSED:
    "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20",
};

const priorityBadgeClass: Record<TicketPriority, string> = {
  LOW: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
  MEDIUM: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200",
  HIGH: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200",
};

const formatRelative = (dateIso: string) =>
  new Date(dateIso).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

const parseListResponse = (data: unknown): AdminTicketListResponse | null => {
  if (typeof data !== "object" || data === null) return null;
  const value = data as Partial<AdminTicketListResponse>;
  if (!Array.isArray(value.items) || typeof value.page !== "number" || typeof value.totalPages !== "number") {
    return null;
  }
  return value as AdminTicketListResponse;
};

const isDetail = (data: unknown): data is AdminTicketDetail => {
  if (typeof data !== "object" || data === null) return false;
  const value = data as Partial<AdminTicketDetail>;
  return (
    typeof value.id === "string" &&
    typeof value.code === "string" &&
    typeof value.title === "string" &&
    Array.isArray(value.messages)
  );
};

const isChatSender = (
  sender: TicketMessage["sender"]
): sender is TicketSender => sender === "user" || sender === "admin";

interface AdminDashboardProps {
  onBackHome: () => void;
}

export const AdminDashboard = ({ onBackHome }: AdminDashboardProps) => {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [adminUser, setAdminUser] = useState<string | null>(null);
  const [loginUsername, setLoginUsername] = useState("admin");
  const [loginPassword, setLoginPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  const [tickets, setTickets] = useState<AdminTicketSummary[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState<"ALL" | TicketStatus>("ALL");
  const [assignedFilter, setAssignedFilter] = useState<"all" | "me" | "unassigned">("all");
  const [query, setQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [ticketDetail, setTicketDetail] = useState<AdminTicketDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [messageInput, setMessageInput] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<TicketStatus>("OPEN");
  const lastDetailMessageAtRef = useRef<string>(new Date(0).toISOString());
  const notifiedEventIdsRef = useRef<Set<string>>(new Set());
  const lastAdminNotifAtRef = useRef<string>(new Date().toISOString());

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", "10");
    if (status !== "ALL") params.set("status", status);
    if (assignedFilter !== "all") params.set("assigned", assignedFilter);
    if (query) params.set("q", query);
    return params.toString();
  }, [page, status, assignedFilter, query]);

  const exportQueryString = useMemo(() => {
    const params = new URLSearchParams();
    if (status !== "ALL") params.set("status", status);
    if (assignedFilter !== "all") params.set("assigned", assignedFilter);
    if (query) params.set("q", query);
    return params.toString();
  }, [status, assignedFilter, query]);

  const checkSession = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/session");
      const data = (await res.json()) as AdminSessionResponse;
      if (res.ok && data.authenticated && data.user) {
        setAuthenticated(true);
        setAdminUser(data.user);
      } else {
        setAuthenticated(false);
        setAdminUser(null);
      }
    } catch {
      setAuthenticated(false);
      setAdminUser(null);
    } finally {
      setAuthChecked(true);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const loadTickets = useCallback(async () => {
    if (!authenticated) return;
    setLoadingList(true);
    setListError(null);

    try {
      const res = await fetch(`/api/admin/tickets?${queryString}`);
      const data: unknown = await res.json();
      if (!res.ok) {
        setListError("Gagal memuat daftar tiket.");
        setTickets([]);
        return;
      }

      const parsed = parseListResponse(data);
      if (!parsed) {
        setListError("Format data tiket tidak valid.");
        setTickets([]);
        return;
      }

      setTickets(parsed.items);
      setTotalPages(parsed.totalPages || 1);

      if (!selectedTicketId && parsed.items[0]) {
        setSelectedTicketId(parsed.items[0].id);
      } else if (
        selectedTicketId &&
        !parsed.items.some((ticket) => ticket.id === selectedTicketId)
      ) {
        setSelectedTicketId(parsed.items[0]?.id || null);
      }
    } catch {
      setListError("Koneksi terputus saat memuat daftar tiket.");
      setTickets([]);
    } finally {
      setLoadingList(false);
    }
  }, [authenticated, queryString, selectedTicketId]);

  const loadTicketDetail = useCallback(
    async (id: string) => {
      if (!authenticated) return;
      setLoadingDetail(true);
      setDetailError(null);

      try {
        const res = await fetch(`/api/admin/tickets/${id}`);
        const data: unknown = await res.json();

        if (!res.ok || !isDetail(data)) {
          setDetailError("Gagal memuat detail tiket.");
          setTicketDetail(null);
          return;
        }

        const filteredMessages = data.messages.filter((msg) =>
          isChatSender(msg.sender)
        );
        setTicketDetail({
          ...data,
          messages: filteredMessages,
        });
        setSelectedStatus(data.status);
        if (filteredMessages.length > 0) {
          lastDetailMessageAtRef.current =
            filteredMessages[filteredMessages.length - 1].createdAt;
        } else {
          lastDetailMessageAtRef.current = new Date(0).toISOString();
        }
      } catch {
        setDetailError("Koneksi terputus saat memuat detail tiket.");
        setTicketDetail(null);
      } finally {
        setLoadingDetail(false);
      }
    },
    [authenticated]
  );

  useEffect(() => {
    if (!authenticated) return;
    loadTickets();
  }, [authenticated, queryString, loadTickets]);

  useEffect(() => {
    if (!authenticated || !selectedTicketId) return;
    loadTicketDetail(selectedTicketId);
  }, [authenticated, selectedTicketId, loadTicketDetail]);

  useEffect(() => {
    if (!authenticated || !ticketDetail?.code) return;

    const source = new EventSource(
      `/api/tickets/${ticketDetail.code}/messages/stream?after=${encodeURIComponent(lastDetailMessageAtRef.current)}`
    );

    source.addEventListener("message", (event) => {
      try {
        const data = JSON.parse((event as MessageEvent).data) as TicketMessage;
        if (!isChatSender(data.sender)) return;
        setTicketDetail((prev) => {
          if (!prev) return prev;
          if (prev.messages.some((msg) => msg.id === data.id)) return prev;
          lastDetailMessageAtRef.current = data.createdAt;
          return {
            ...prev,
            messages: [...prev.messages, data],
            unreadUserMessages:
              data.sender === "user"
                ? prev.unreadUserMessages + 1
                : prev.unreadUserMessages,
          };
        });
      } catch {
        // Ignore malformed events.
      }
    });

    return () => {
      source.close();
    };
  }, [authenticated, ticketDetail?.id, ticketDetail?.code]);

  useEffect(() => {
    if (!authenticated) return;

    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        void Notification.requestPermission();
      }
    }

    const source = new EventSource(
      `/api/admin/notifications/stream?after=${encodeURIComponent(lastAdminNotifAtRef.current)}`
    );

    source.addEventListener("notification", (event) => {
      try {
        const payload = JSON.parse(
          (event as MessageEvent).data
        ) as AdminNotificationEvent;

        if (notifiedEventIdsRef.current.has(payload.id)) return;
        notifiedEventIdsRef.current.add(payload.id);
        lastAdminNotifAtRef.current = payload.createdAt;

        if (payload.type === "ticket_created") {
          toast("Tiket Baru Masuk", {
            description: `${payload.ticketCode} - ${payload.title}`,
          });
          void loadTickets();
        }

        if (payload.type === "user_message") {
          toast("Pesan User Baru", {
            description: `${payload.ticketCode}: ${payload.message.slice(0, 80)}`,
          });
          setTickets((prev) => {
            const found = prev.some((ticket) => ticket.id === payload.ticketId);
            if (!found) return prev;
            return prev.map((ticket) =>
              ticket.id === payload.ticketId
                ? {
                    ...ticket,
                    unreadUserMessages:
                      selectedTicketId === payload.ticketId
                        ? ticket.unreadUserMessages
                        : ticket.unreadUserMessages + 1,
                    updatedAt: payload.createdAt,
                  }
                : ticket
            );
          });
        }

        if (
          typeof window !== "undefined" &&
          "Notification" in window &&
          Notification.permission === "granted"
        ) {
          const title =
            payload.type === "ticket_created"
              ? `Tiket Baru ${payload.ticketCode}`
              : `Pesan Baru ${payload.ticketCode}`;
          const body =
            payload.type === "ticket_created"
              ? payload.title
              : payload.message;
          new Notification(title, { body });
        }
      } catch {
        // Ignore malformed notification event.
      }
    });

    source.addEventListener("error", () => {
      source.close();
    });

    return () => {
      source.close();
    };
  }, [authenticated, loadTickets, selectedTicketId]);

  const submitLogin = async () => {
    setAuthError(null);
    setLoggingIn(true);
    try {
      const res = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: loginUsername,
          password: loginPassword,
        }),
      });
      const data = (await res.json()) as AdminSessionResponse;
      if (!res.ok || !data.authenticated || !data.user) {
        setAuthError("Username/password admin tidak valid.");
        return;
      }

      setAuthenticated(true);
      setAdminUser(data.user);
      setLoginPassword("");
      setPage(1);
      await loadTickets();
    } catch {
      setAuthError("Gagal login admin.");
    } finally {
      setLoggingIn(false);
    }
  };

  const logout = async () => {
    await fetch("/api/admin/session", { method: "DELETE" });
    setAuthenticated(false);
    setAdminUser(null);
    setTickets([]);
    setTicketDetail(null);
    setSelectedTicketId(null);
    setAuthError(null);
  };

  const markRead = async (ticketId: string) => {
    try {
      await fetch(`/api/admin/tickets/${ticketId}/read`, {
        method: "POST",
      });
      setTickets((prev) =>
        prev.map((ticket) =>
          ticket.id === ticketId ? { ...ticket, unreadUserMessages: 0 } : ticket
        )
      );
      setTicketDetail((prev) =>
        prev && prev.id === ticketId ? { ...prev, unreadUserMessages: 0 } : prev
      );
    } catch {
      // ignore
    }
  };

  const submitAdminReply = async () => {
    if (!ticketDetail || !messageInput.trim()) return;
    setSendingMessage(true);
    setDetailError(null);

    try {
      const res = await fetch(`/api/tickets/${ticketDetail.code}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender: "admin",
          message: messageInput.trim(),
        }),
      });

      if (!res.ok) {
        setDetailError("Pesan gagal dikirim.");
        return;
      }

      const created = (await res.json()) as TicketMessage;
      setMessageInput("");
      setTicketDetail((prev) => {
        if (!prev) return prev;
        if (prev.messages.some((msg) => msg.id === created.id)) return prev;
        lastDetailMessageAtRef.current = created.createdAt;
        return {
          ...prev,
          messages: [...prev.messages, created],
          unreadUserMessages: 0,
        };
      });
      setTickets((prev) =>
        prev.map((ticket) =>
          ticket.id === ticketDetail.id
            ? {
                ...ticket,
                status:
                  ticket.status === "OPEN" ? "IN_PROGRESS" : ticket.status,
                unreadUserMessages: 0,
                updatedAt: created.createdAt,
              }
            : ticket
        )
      );
      if (ticketDetail.status === "OPEN") {
        setSelectedStatus("IN_PROGRESS");
        setTicketDetail((prev) =>
          prev ? { ...prev, status: "IN_PROGRESS" } : prev
        );
      }
      void markRead(ticketDetail.id);
    } catch {
      setDetailError("Koneksi terputus saat mengirim pesan.");
    } finally {
      setSendingMessage(false);
    }
  };

  const submitStatusUpdate = async (nextStatus: TicketStatus) => {
    if (!ticketDetail) return;
    setSelectedStatus(nextStatus);
    setUpdatingStatus(true);
    setDetailError(null);

    try {
      const res = await fetch(`/api/admin/tickets/${ticketDetail.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!res.ok) {
        setDetailError("Status tiket gagal diperbarui.");
        return;
      }

      setTicketDetail((prev) =>
        prev ? { ...prev, status: nextStatus } : prev
      );
      setTickets((prev) =>
        prev.map((ticket) =>
          ticket.id === ticketDetail.id
            ? { ...ticket, status: nextStatus }
            : ticket
        )
      );
      await loadTicketDetail(ticketDetail.id);
      await loadTickets();
    } catch {
      setDetailError("Koneksi terputus saat update status.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const downloadReport = async () => {
    if (!authenticated) return;
    setDownloadingReport(true);
    try {
      const url = exportQueryString
        ? `/api/admin/reports/export?${exportQueryString}`
        : "/api/admin/reports/export";

      const res = await fetch(url);
      if (!res.ok) {
        toast.error("Gagal mengunduh laporan.");
        return;
      }

      const blob = await res.blob();
      const contentDisposition = res.headers.get("content-disposition") || "";
      const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
      const filename = filenameMatch?.[1] || "ticket-report.csv";
      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(downloadUrl);
      toast.success("Laporan berhasil diunduh.");
    } catch {
      toast.error("Koneksi terputus saat download laporan.");
    } finally {
      setDownloadingReport(false);
    }
  };

  if (!authChecked) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        Memeriksa sesi admin...
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center gap-2 text-slate-800 dark:text-white">
          <Shield className="size-5 text-blue-500" />
          <h2 className="text-lg font-bold">Admin Login</h2>
        </div>
        <div className="space-y-3">
          <input
            type="text"
            value={loginUsername}
            onChange={(e) => setLoginUsername(e.target.value)}
            placeholder="Username admin"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
          <input
            type="password"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            placeholder="Password admin"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
          {authError && (
            <p className="text-xs text-red-600 dark:text-red-400">{authError}</p>
          )}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onBackHome}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-300"
            >
              Kembali
            </button>
            <button
              type="button"
              onClick={submitLogin}
              disabled={loggingIn || !loginUsername || !loginPassword}
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
            >
              {loggingIn ? "Masuk..." : "Masuk Admin"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Admin Dashboard</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Login sebagai: <span className="font-semibold">{adminUser}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={downloadReport}
            disabled={downloadingReport}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Download className="size-4" />
            {downloadingReport ? "Mengunduh..." : "Download Laporan"}
          </button>
          <button
            type="button"
            onClick={loadTickets}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <RefreshCw className="size-4" />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => router.push("/admin/users")}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Kelola Admin
          </button>
          <button
            type="button"
            onClick={logout}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Logout
          </button>
          <button
            type="button"
            onClick={onBackHome}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Kembali
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[390px_minmax(0,1fr)] xl:h-[calc(100vh-170px)]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col min-h-0">
          <div className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
            <Shield className="size-4 text-blue-500" />
            Queue Tiket
          </div>

          <div className="space-y-3">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Cari kode/judul tiket..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={status}
                onChange={(e) => {
                  setPage(1);
                  setStatus(e.target.value as "ALL" | TicketStatus);
                }}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="ALL">Semua Status</option>
                <option value="OPEN">Baru</option>
                <option value="IN_PROGRESS">Dikerjakan</option>
                <option value="WAITING">Menunggu</option>
                <option value="CLOSED">Selesai</option>
              </select>
              <select
                value={assignedFilter}
                onChange={(e) => {
                  setPage(1);
                  setAssignedFilter(e.target.value as "all" | "me" | "unassigned");
                }}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="all">Semua Assignment</option>
                <option value="me">Assigned ke saya</option>
                <option value="unassigned">Belum assigned</option>
              </select>
            </div>
            <button
              type="button"
              onClick={() => {
                setPage(1);
                setQuery(searchInput.trim());
              }}
              className="w-full rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
            >
              Cari
            </button>
          </div>

          <div className="mt-4 space-y-3 flex-1 overflow-y-auto min-h-0 pr-1">
            {loadingList && (
              <p className="text-sm text-slate-500 dark:text-slate-400">Memuat tiket...</p>
            )}
            {listError && (
              <p className="text-sm text-red-600 dark:text-red-400">{listError}</p>
            )}
            {!loadingList &&
              !listError &&
              tickets.map((ticket) => (
                <button
                  key={ticket.id}
                  onClick={async () => {
                    setSelectedTicketId(ticket.id);
                    if (ticket.unreadUserMessages > 0) {
                      await markRead(ticket.id);
                    }
                  }}
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    selectedTicketId === ticket.id
                      ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-500/10"
                      : "border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-300">{ticket.code}</span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusBadgeClass[ticket.status]}`}
                    >
                      {statusLabel[ticket.status].toUpperCase()}
                    </span>
                  </div>
                  <div className="mt-2 flex items-start justify-between gap-2">
                    <p className="line-clamp-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {ticket.title}
                    </p>
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${priorityBadgeClass[ticket.priority]}`}
                    >
                      {ticket.priority}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span>Update: {formatRelative(ticket.updatedAt)}</span>
                    <span className="inline-flex items-center gap-1 font-semibold">
                      <UserCheck className="size-3" />
                      {ticket.assignedAdminId || "Unassigned"}
                    </span>
                  </div>
                  {ticket.unreadUserMessages > 0 && (
                    <span className="mt-2 inline-flex rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600 dark:bg-red-500/10 dark:text-red-300">
                      {ticket.unreadUserMessages} pesan baru
                    </span>
                  )}
                </button>
              ))}
          </div>

          <div className="mt-4 shrink-0 flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Halaman {page} / {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={loadingList || page <= 1}
                className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300"
              >
                Prev
              </button>
              <button
                type="button"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={loadingList || page >= totalPages}
                className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col min-h-0">
          {!selectedTicketId && (
            <div className="flex h-96 items-center justify-center text-slate-500 dark:text-slate-400">
              Pilih tiket untuk mulai memproses.
            </div>
          )}

          {selectedTicketId && (
            <div className="space-y-4 flex flex-col min-h-0 h-full">
              {loadingDetail && (
                <p className="text-sm text-slate-500 dark:text-slate-400">Memuat detail tiket...</p>
              )}
              {detailError && (
                <p className="text-sm text-red-600 dark:text-red-400">{detailError}</p>
              )}

              {ticketDetail && !loadingDetail && (
                <div className="flex flex-col min-h-0 h-full space-y-4">
                  <div className="space-y-3 border-b border-slate-200 pb-3 dark:border-slate-800">
                    <div className="space-y-1">
                      <div className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-300">
                        <Ticket className="size-3.5" />
                        {ticketDetail.code} / {ticketDetail.reporterName || "Pelapor"}
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                        {ticketDetail.title}
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {ticketDetail.description}
                      </p>
                    </div>

                    <div className="w-full rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                        <span className="rounded-md bg-slate-100 px-2 py-1 dark:bg-slate-800">
                          Prioritas: {ticketDetail.priority}
                        </span>
                        <span className="rounded-md bg-slate-100 px-2 py-1 dark:bg-slate-800">
                          Kategori: {ticketDetail.category}
                        </span>
                        <span className="rounded-md bg-slate-100 px-2 py-1 dark:bg-slate-800">
                          Assigned: {ticketDetail.assignedAdminId || "-"}
                        </span>
                        <span className="rounded-md bg-slate-100 px-2 py-1 dark:bg-slate-800">
                          Unread user msg: {ticketDetail.unreadUserMessages}
                        </span>
                        <span className="rounded-md bg-slate-100 px-2 py-1 dark:bg-slate-800">
                          Respons SLA: {formatRelative(ticketDetail.responseDueAt)}
                        </span>
                        <span className="rounded-md bg-slate-100 px-2 py-1 dark:bg-slate-800">
                          Resolve SLA: {formatRelative(ticketDetail.resolveDueAt)}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <select
                          value={selectedStatus}
                          onChange={(e) =>
                            void submitStatusUpdate(
                              e.target.value as TicketStatus
                            )
                          }
                          disabled={updatingStatus}
                          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-semibold outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        >
                          <option value="OPEN">OPEN</option>
                          <option value="IN_PROGRESS">IN_PROGRESS</option>
                          <option value="WAITING">WAITING</option>
                          <option value="CLOSED">CLOSED</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 min-h-[220px] space-y-3 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/50">
                    {ticketDetail.messages.length === 0 && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Belum ada pesan pada tiket ini.
                      </p>
                    )}
                    {ticketDetail.messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${
                          msg.sender === "admin" ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                            msg.sender === "admin"
                              ? "bg-blue-600 text-white"
                              : "border border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                          }`}
                        >
                          <p className="mb-1 text-[10px] font-semibold opacity-80">
                            {msg.sender === "admin" ? "Admin" : "Pelapor"}
                          </p>
                          <p>{msg.message}</p>
                          <p className="mt-1 text-[10px] opacity-75">{formatRelative(msg.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      submitAdminReply();
                    }}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900 shrink-0"
                  >
                    <input
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      placeholder="Ketik balasan admin..."
                      className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      disabled={sendingMessage}
                    />
                    <button
                      type="submit"
                      disabled={sendingMessage || !messageInput.trim()}
                      className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      {sendingMessage ? (
                        <>
                          <RefreshCw className="size-4 animate-spin" />
                          Mengirim
                        </>
                      ) : (
                        <>
                          <Send className="size-4" />
                          Kirim
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function AdminRoutePage() {
  const router = useRouter();
  return <AdminDashboard onBackHome={() => router.push("/")} />;
}
