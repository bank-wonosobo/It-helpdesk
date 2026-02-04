import React, { useState, useEffect, useRef } from "react";
import { Send, User, MessageSquare, ArrowLeft, Clock, CheckCircle2, MapPin, Tag, AlertTriangle } from "lucide-react";

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
  id: number;
  text: string;
  sender: "user" | "admin";
  timestamp: string;
}

export const ChatPage = ({ onBack, ticketId, ticketData }: ChatPageProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: `Halo ${ticketData.name}! Laporan Anda mengenai "${ticketData.title}" telah kami terima dengan ID ${ticketId}. Ada yang bisa kami bantu lebih lanjut sambil menunggu tim kami memprosesnya?`,
      sender: "admin",
      timestamp: "Baru saja",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMessage: Message = {
      id: Date.now(),
      text: inputText,
      sender: "user",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages([...messages, newMessage]);
    setInputText("");

    // Simulate Admin Response
    setTimeout(() => {
      const adminResponse: Message = {
        id: Date.now() + 1,
        text: "Terima kasih informasinya. Tim IT kami sedang meninjau detail laporan Anda. Mohon tunggu sebentar ya.",
        sender: "admin",
        timestamp: "Baru saja",
      };
      setMessages((prev) => [...prev, adminResponse]);
    }, 2000);
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
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full text-xs font-bold border border-blue-100 dark:border-blue-500/20">
            <CheckCircle2 className="size-3" />
            Aktif
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
        {messages.map((msg) => (
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
        <form onSubmit={handleSendMessage} className="flex gap-3">
          <input 
            type="text" 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ketik pesan balasan di sini..." 
            className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all dark:text-white"
          />
          <button 
            type="submit"
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
