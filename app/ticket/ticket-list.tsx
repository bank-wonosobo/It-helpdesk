import React from "react";
import { 
  Plus, 
  MoreVertical, 
  Filter, 
  ChevronRight,
  Monitor,
  Wifi,
  Lock,
  MessageSquare
} from "lucide-react";

const tickets = [
  {
    id: "TICK-2024-001",
    title: "Layar Monitor Berkedip",
    category: "Hardware",
    status: "Proses",
    priority: "Tinggi",
    date: "20 Jan 2024",
    icon: Monitor
  },
  {
    id: "TICK-2024-002",
    title: "Akses VPN Tidak Bisa",
    category: "Jaringan",
    status: "Tertunda",
    priority: "Medium",
    date: "19 Jan 2024",
    icon: Wifi
  },
  {
    id: "TICK-2024-003",
    title: "Reset Password Email",
    category: "Keamanan",
    status: "Selesai",
    priority: "Rendah",
    date: "18 Jan 2024",
    icon: Lock
  },
  {
    id: "TICK-2024-004",
    title: "Instalasi Software Adobe",
    category: "Software",
    status: "Proses",
    priority: "Medium",
    date: "17 Jan 2024",
    icon: Monitor
  },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "Selesai": return "bg-emerald-50 text-emerald-700 border-emerald-100";
    case "Proses": return "bg-blue-50 text-blue-700 border-blue-100";
    case "Tertunda": return "bg-amber-50 text-amber-700 border-amber-100";
    default: return "bg-slate-50 text-slate-700 border-slate-100";
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "Tinggi": return "text-rose-600";
    case "Medium": return "text-amber-600";
    case "Rendah": return "text-slate-600";
    default: return "text-slate-600";
  }
};

export const TicketListView = ({ onNewTicket }: { onNewTicket: () => void }) => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Tiket Saya</h2>
          <p className="text-slate-500 mt-1">Daftar permintaan bantuan IT yang Anda ajukan.</p>
        </div>
        <button 
          onClick={onNewTicket}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
        >
          <Plus className="size-4" />
          Buat Tiket Baru
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
              <Filter className="size-3.5" />
              Filter
            </button>
            <div className="h-4 w-[1px] bg-slate-300 mx-2"></div>
            <span className="text-xs text-slate-500">Menampilkan {tickets.length} tiket</span>
          </div>
          <div className="flex gap-1">
            <button className="p-1.5 hover:bg-white rounded-lg transition-colors">
              <ChevronRight className="size-4 text-slate-400" />
            </button>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {tickets.map((ticket) => (
            <div key={ticket.id} className="group p-4 hover:bg-slate-50/50 transition-colors flex items-center gap-4 cursor-pointer">
              <div className="p-3 bg-slate-100 rounded-xl group-hover:bg-white transition-colors">
                <ticket.icon className="size-5 text-slate-600" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-slate-400 uppercase tracking-tight">{ticket.id}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm border ${getStatusColor(ticket.status)}`}>
                    {ticket.status.toUpperCase()}
                  </span>
                </div>
                <h4 className="font-semibold text-slate-800 truncate">{ticket.title}</h4>
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    {ticket.category}
                  </span>
                  <span className={`text-xs font-medium flex items-center gap-1 ${getPriorityColor(ticket.priority)}`}>
                    ● {ticket.priority}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-6 text-right">
                <div className="hidden md:block">
                  <p className="text-sm font-medium text-slate-800">{ticket.date}</p>
                  <p className="text-xs text-slate-400">Tanggal Pengajuan</p>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <MessageSquare className="size-4" />
                  <span className="text-xs font-medium">2</span>
                </div>
                <button className="p-2 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg transition-all text-slate-400 hover:text-slate-600">
                  <MoreVertical className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
