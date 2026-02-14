"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  Send, 
  User, 
  ArrowLeft, 
  Clock, 
  CheckCircle2, 
  MapPin, 
  Tag, 
  AlertTriangle,
  Star
} from "lucide-react";

interface ChatPageProps {
  onBack: () => void;
  ticketId: string;
  ticketData: {
    name: string;
    location: string;
    title: string;
    category: string;
    urgency: string;
  };
}

interface Message {
  id: string;
  text: string;
  sender: "user" | "admin";
  timestamp: string;
  createdAt: string;
}

type TicketStatus = "OPEN" | "IN_PROGRESS" | "WAITING" | "CLOSED";
type ChatTicketData = {
  name: string;
  location: string;
  title: string;
  category: string;
  urgency: string;
  detail?: string;
};
type StreamMessage = {
  id: string;
  ticketId: string;
  sender: "user" | "admin";
  message: string;
  createdAt: string;
};
type PersistedChatState = {
  ticketId: string;
  ticketData: ChatTicketData | null;
};

const LAST_CHAT_STORAGE_KEY = "hd_last_chat_state";
const WELCOME_PREFIX = "welcome:";
const WELCOME_TEXT =
  "Halo,Tim kami akan segera meninjau masalah Anda. Selagi menunggu, adakah hal lain yang perlu kami tahu ?";

const parseJsonSafe = async <T,>(res: Response): Promise<T | null> => {
  const raw = await res.text();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const getStatusLabel = (status: TicketStatus | null) => {
  switch (status) {
    case "OPEN":
      return "Baru";
    case "IN_PROGRESS":
      return "Diproses";
    case "WAITING":
      return "Menunggu";
    case "CLOSED":
      return "Selesai";
    default:
      return "Tidak diketahui";
  }
};

export const ChatPage = ({ onBack, ticketId, ticketData }: ChatPageProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  const [ticketStatus, setTicketStatus] = useState<
    TicketStatus | null
  >(null);
  const [feedbackRating, setFeedbackRating] = useState<number | null>(null);
  const [draftRating, setDraftRating] = useState<number>(0);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [closingTicket, setClosingTicket] = useState(false);

  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageAtRef = useRef<string>(new Date(0).toISOString());

  // const scrollToBottom = () => {
  //   messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  // };

  // useEffect(() => {
  //   scrollToBottom();
  // }, [messages]);

  useEffect(() => {
    const loadMessages = async () => {
      setLoading(true);
      try {
        const [messagesRes, ticketRes] = await Promise.all([
          fetch(`/api/tickets/${ticketId}/messages`),
          fetch(`/api/tickets/${ticketId}`),
        ]);
        const data = await parseJsonSafe<
          Array<{
            id: string;
            message: string;
            sender: "user" | "admin";
            createdAt: string;
          }>
        >(messagesRes);

        if (!messagesRes.ok || !data) {
          setMessages([]);
          return;
        }

        if (!Array.isArray(data)) {
          console.error("Invalid messages response:", data);
          setMessages([]);
          return;
        }

        const mapped = data.map((m: {
          id: string;
          message: string;
          sender: "user" | "admin";
          createdAt: string;
        }) => ({
          id: m.id,
          text: m.message,
          sender: m.sender,
          timestamp: new Date(m.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          createdAt: m.createdAt,
        }));

        const unique = Array.from(
          new Map(mapped.map((message) => [message.id, message])).values()
        );
        const hasAdminMessage = unique.some((msg) => msg.sender === "admin");
        const withWelcome = hasAdminMessage
          ? unique
          : [
              {
                id: `${WELCOME_PREFIX}${ticketId}`,
                text: WELCOME_TEXT,
                sender: "admin" as const,
                timestamp: new Date().toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
                createdAt: new Date().toISOString(),
              },
              ...unique,
            ];

        setMessages(withWelcome);
        if (data.length > 0) {
          const last = data[data.length - 1] as { createdAt: string };
          lastMessageAtRef.current = last.createdAt;
        }

        if (ticketRes.ok) {
          const ticket = await parseJsonSafe<{
            status?: TicketStatus;
            feedbackRating?: number | null;
          }>(
            ticketRes
          );
          if (!ticket) {
            setTicketStatus(null);
            return;
          }
          if (
            ticket.status === "OPEN" ||
            ticket.status === "IN_PROGRESS" ||
            ticket.status === "WAITING" ||
            ticket.status === "CLOSED"
          ) {
            setTicketStatus(ticket.status);
          }
          if (typeof ticket.feedbackRating === "number") {
            setFeedbackRating(ticket.feedbackRating);
            setDraftRating(ticket.feedbackRating);
          } else {
            setFeedbackRating(null);
            setDraftRating(0);
          }
        }
      } catch {
        setMessages([]);
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, [ticketId]);

  useEffect(() => {
    const source = new EventSource(
      `/api/tickets/${ticketId}/messages/stream?after=${encodeURIComponent(lastMessageAtRef.current)}`
    );

    source.addEventListener("message", (event) => {
      try {
        const payload = JSON.parse((event as MessageEvent).data) as StreamMessage;
        setMessages((prev) => {
          if (prev.some((msg) => msg.id === payload.id)) return prev;
          lastMessageAtRef.current = payload.createdAt;
          return [
            ...prev,
            {
              id: payload.id,
              text: payload.message,
              sender: payload.sender,
              timestamp: new Date(payload.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
              createdAt: payload.createdAt,
            },
          ];
        });
      } catch {
        // Ignore malformed stream payloads.
      }
    });

    return () => {
      source.close();
    };
  }, [ticketId]);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const ticketRes = await fetch(`/api/tickets/${ticketId}`);
        if (!ticketRes.ok) return;
        const ticket = await parseJsonSafe<{
          status?: TicketStatus;
          feedbackRating?: number | null;
        }>(ticketRes);
        if (!ticket) return;
        if (
          ticket.status === "OPEN" ||
          ticket.status === "IN_PROGRESS" ||
          ticket.status === "WAITING" ||
          ticket.status === "CLOSED"
        ) {
          setTicketStatus(ticket.status);
        }
        if (typeof ticket.feedbackRating === "number") {
          setFeedbackRating(ticket.feedbackRating);
          setDraftRating(ticket.feedbackRating);
        }
      } catch {
        // Ignore transient polling errors.
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [ticketId]);


const handleSendMessage = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!inputText.trim()) return;

  const res = await fetch(`/api/tickets/${ticketId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sender: "user",
      message: inputText,
    }),
  });

  const saved = await parseJsonSafe<{
    id: string;
    message: string;
    sender: "user" | "admin";
    createdAt: string;
    error?: string;
  }>(res);

  if (!res.ok) {
    alert(saved?.error || "Gagal mengirim pesan");
    if (res.status === 409) {
      setTicketStatus("CLOSED");
    }
    return;
  }

  if (!saved?.id || !saved?.message || !saved?.sender || !saved?.createdAt) {
    alert("Respons server tidak valid. Coba kirim ulang.");
    return;
  }

  setMessages((prev) => {
    if (prev.some((msg) => msg.id === saved.id)) return prev;
    return [
      ...prev,
      {
        id: saved.id,
        text: saved.message,
        sender: saved.sender,
        timestamp: new Date(saved.createdAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        createdAt: saved.createdAt,
      },
    ];
  });
  lastMessageAtRef.current = saved.createdAt;

  setInputText("");

  const ticketRes = await fetch(`/api/tickets/${ticketId}`);
  if (ticketRes.ok) {
    const ticket = await parseJsonSafe<{
      status?: TicketStatus;
      feedbackRating?: number | null;
    }>(ticketRes);
    if (!ticket) return;
    if (
      ticket.status === "OPEN" ||
      ticket.status === "IN_PROGRESS" ||
      ticket.status === "WAITING" ||
      ticket.status === "CLOSED"
    ) {
      setTicketStatus(ticket.status);
    }
    if (typeof ticket.feedbackRating === "number") {
      setFeedbackRating(ticket.feedbackRating);
      setDraftRating(ticket.feedbackRating);
    } else {
      setFeedbackRating(null);
      setDraftRating(0);
    }
  }
};

const closeTicketByUser = async () => {
  if (ticketStatus === "CLOSED") return;
  const confirmed = window.confirm(
    "Yakin ingin menyelesaikan tiket ini sekarang?"
  );
  if (!confirmed) return;

  setClosingTicket(true);
  try {
    const res = await fetch(`/api/tickets/${ticketId}/close`, {
      method: "POST",
    });
    const payload = await parseJsonSafe<{
      status?: TicketStatus;
      feedbackRating?: number | null;
      error?: string;
    }>(res);
    if (!res.ok) {
      alert(payload?.error || "Gagal menyelesaikan tiket.");
      return;
    }
    setTicketStatus("CLOSED");
    if (typeof payload?.feedbackRating === "number") {
      setFeedbackRating(payload.feedbackRating);
      setDraftRating(payload.feedbackRating);
    } else {
      setFeedbackRating(null);
      setDraftRating(0);
    }
  } catch {
    alert("Koneksi terputus saat menutup tiket.");
  } finally {
    setClosingTicket(false);
  }
};

const submitFeedback = async () => {
  if (ticketStatus !== "CLOSED" || draftRating < 1 || draftRating > 5) return;
  setSubmittingFeedback(true);
  try {
    const res = await fetch(`/api/tickets/${ticketId}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating: draftRating }),
    });
    const payload = await parseJsonSafe<{ feedbackRating?: number; error?: string }>(
      res
    );
    if (!res.ok) {
      alert(payload?.error || "Gagal mengirim feedback.");
      return;
    }
    if (typeof payload?.feedbackRating === "number") {
      setFeedbackRating(payload.feedbackRating);
    } else {
      setFeedbackRating(draftRating);
    }
  } catch {
    alert("Koneksi terputus saat mengirim feedback.");
  } finally {
    setSubmittingFeedback(false);
  }
};

  return (
    <div className="max-w-3xl mx-auto h-[calc(100vh-200px)] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Chat */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-3xl overflow-hidden shadow-sm">
        <div className="p-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
            >
              <ArrowLeft className="size-5 text-slate-500" />
            </button>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Diskusi Tiket {ticketId}
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              </h2>
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <Clock className="size-3" />
                Biasanya membalas dalam 5 menit
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {ticketStatus !== "CLOSED" && (
              <button
                type="button"
                onClick={closeTicketByUser}
                disabled={closingTicket}
                className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20"
              >
                {closingTicket ? "Menyelesaikan..." : "Selesaikan Tiket"}
              </button>
            )}
            <button
              type="button"
              onClick={() => onBack()}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Beranda
            </button>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border ${
              ticketStatus === "CLOSED"
                ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20"
                : "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-500/20"
            }`}>
              <CheckCircle2 className="size-3" />
              {getStatusLabel(ticketStatus)}
            </div>
          </div>
        </div>

        {/* Detail Tiket Section */}
        <div className="bg-slate-50/50 dark:bg-slate-800/30 p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-[11px] border-b border-slate-100 dark:border-slate-800">
          <div className="space-y-1">
            <p className="text-slate-400 font-medium uppercase tracking-wider flex items-center gap-1">
              <User className="size-3" /> Pelapor
            </p>
            <p className="font-bold text-slate-700 dark:text-slate-200">{ticketData.name}</p>
          </div>
          <div className="space-y-1">
            <p className="text-slate-400 font-medium uppercase tracking-wider flex items-center gap-1">
              <MapPin className="size-3" /> Lokasi
            </p>
            <p className="font-bold text-slate-700 dark:text-slate-200">{ticketData.location}</p>
          </div>
          <div className="space-y-1">
            <p className="text-slate-400 font-medium uppercase tracking-wider flex items-center gap-1">
              <Tag className="size-3" /> Kategori
            </p>
            <p className="font-bold text-slate-700 dark:text-slate-200">{ticketData.category.split(' ')[0]}</p>
          </div>
          <div className="space-y-1">
            <p className="text-slate-400 font-medium uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle className="size-3" /> Urgensi
            </p>
            <p className={`font-bold ${ticketData.urgency.includes('Mendesak') ? 'text-red-500' : 'text-slate-700 dark:text-slate-200'}`}>
              {ticketData.urgency.split(' ')[0]}
            </p>
          </div>
        </div>
      </div>

      {/* Area Pesan */}
      <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-slate-950/50 border-x border-slate-200 dark:border-slate-800 space-y-4 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
        {loading && (
          <p className="text-center text-xs text-slate-400">
            Memuat percakapan...
          </p>
        )}
        {!loading && 
        messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}
          >
            <div className={`max-w-[80%] flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}>
              <div 
                className={`px-4 py-3 rounded-2xl text-sm ${
                  msg.sender === "user" 
                    ? "bg-blue-600 text-white rounded-tr-none shadow-lg shadow-blue-500/10" 
                    : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-none border border-slate-100 dark:border-slate-700 shadow-sm"
                }`}
              >
                {msg.text}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 px-1">{msg.timestamp}</span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Chat */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-b-3xl p-4 shadow-lg">
        {ticketStatus === "CLOSED" && (
          <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-500/30 dark:bg-amber-500/10">
            <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
              {feedbackRating
                ? "Terima kasih, feedback Anda sudah kami terima."
                : "Tiket selesai. Mohon beri penilaian layanan (1-5 bintang)."}
            </p>
            <div className="mt-2 flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  disabled={feedbackRating !== null || submittingFeedback}
                  onClick={() => setDraftRating(value)}
                  className="rounded-md p-1.5 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-70 dark:hover:bg-amber-500/20"
                >
                  <Star
                    className={`size-5 ${
                      value <= (feedbackRating ?? draftRating)
                        ? "fill-amber-500 text-amber-500"
                        : "text-amber-300 dark:text-amber-500/50"
                    }`}
                  />
                </button>
              ))}
              {feedbackRating === null && (
                <button
                  type="button"
                  onClick={submitFeedback}
                  disabled={draftRating < 1 || submittingFeedback}
                  className="ml-2 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
                >
                  {submittingFeedback ? "Mengirim..." : "Kirim Feedback"}
                </button>
              )}
            </div>
          </div>
        )}
        <form onSubmit={handleSendMessage} className="flex gap-3">
          <input 
            type="text" 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={ticketStatus === "CLOSED" ? "Tiket sudah selesai." : "Ketik pesan balasan di sini..."} 
            className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all dark:text-white"
            disabled={ticketStatus === "CLOSED"}
          />
          <button 
            type="submit"
            disabled={ticketStatus === "CLOSED"}
            className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-500/20"
          >
            <Send className="size-5" />
          </button>
        </form>
        <p className="text-[10px] text-slate-400 text-center mt-3">
          Tim IT akan menerima notifikasi pesan Anda secara langsung.
        </p>
      </div>
    </div>
  );
};

export default function ChatRoutePage() {
  const router = useRouter();
  const [state, setState] = useState<PersistedChatState | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LAST_CHAT_STORAGE_KEY);
      if (!raw) {
        setState(null);
      } else {
        const parsed = JSON.parse(raw) as Partial<PersistedChatState>;
        if (typeof parsed.ticketId === "string" && parsed.ticketId) {
          setState({
            ticketId: parsed.ticketId,
            ticketData: parsed.ticketData ?? null,
          });
        } else {
          setState(null);
        }
      }
    } catch {
      setState(null);
    } finally {
      setReady(true);
    }
  }, []);

  if (!ready) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        Memuat chat...
      </div>
    );
  }

  if (!state?.ticketId) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 text-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="text-slate-700 dark:text-slate-200">
          Belum ada tiket aktif untuk dibuka di halaman chat.
        </p>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
        >
          Kembali ke Beranda
        </button>
      </div>
    );
  }

  return (
    <ChatPage
      onBack={() => router.push("/")}
      ticketId={state.ticketId}
      ticketData={
        state.ticketData || {
          name: "User",
          location: "-",
          title: "Kendala IT",
          category: "Lainnya",
          urgency: "Biasa",
        }
      }
    />
  );
}
