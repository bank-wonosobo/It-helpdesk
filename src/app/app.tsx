import * as React from "react";
import { useState, useEffect } from "react";
import { SimpleNavbar } from "@/app/layouting/user-layout";
import { LandingPage } from "@/app/landing-page/landing-page";
import { TicketForm } from "@/app/ticket/ticket-form";
import { DashboardView } from "@/app/dashboard/dashboard";
import { ChatPage } from "@/app/chat/page/chat-page";
import { Toaster } from "sonner";

export default function App() {
    const [currentPage, setCurrentPage] = useState("home");
    const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
    const [activeTicketData, setActiveTicketData] = useState<any>(null);
    const [isDarkMode, setIsDarkMode] = useState(false);
    
    useEffect(() => {
        if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
            setIsDarkMode(false);
        }
    }, []);

    const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

    const renderContent = () => {
        switch (currentPage) {
            case "home":
                return (
                <LandingPage 
                    onCreateClick={() => setCurrentPage("create")}
                    onDashboardClick={() => setCurrentPage("dashboard")}
                />
                );
      case "create":
        return (
          <TicketForm 
            onBack={() => setCurrentPage("home")}
            onSuccess={(id, data) => {
              setActiveTicketId(id);
              setActiveTicketData(data);
              setCurrentPage("chat");
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
              <button 
                onClick={() => setCurrentPage("create")}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
              >
                Buat Laporan Baru
              </button>
            </div>
            <DashboardView />
            
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-800 dark:text-white mb-4">Laporan Terbaru</h3>
              <div className="space-y-4">
                {[
                  { id: "TIC-001", name: "Andi", loc: "Lt. 2", title: "Printer Macet", status: "Selesai" },
                  { id: "TIC-002", name: "Siska", loc: "Lt. 1", title: "Aplikasi Error", status: "Proses" },
                  { id: "TIC-003", name: "Budi", loc: "Lt. 4", title: "Ganti Keyboard", status: "Menunggu" },
                ].map((item) => (
                  <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-lg flex items-center justify-center font-bold text-slate-400 dark:text-slate-500 text-xs border border-slate-100 dark:border-slate-700">
                        {item.id}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-100">{item.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{item.name} • {item.loc}</p>
                      </div>
                    </div>
                    <span className={`self-start sm:self-center text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                      item.status === 'Selesai' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20' : 
                      item.status === 'Proses' ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-500/20' : 
                      'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-500/20'
                    }`}>
                      {item.status.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      default:
        return <LandingPage 
          onCreateClick={() => setCurrentPage("create")}
          onDashboardClick={() => setCurrentPage("dashboard")}
        />;
    }
  };

  return (
    <div className={isDarkMode ? "dark" : ""}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 selection:bg-blue-100 dark:selection:bg-blue-900 transition-colors duration-300">
        <Toaster position="top-center" richColors theme={isDarkMode ? "dark" : "light"} />
        <SimpleNavbar 
          onNavigate={setCurrentPage} 
          activePage={currentPage} 
          isDarkMode={isDarkMode}
          toggleDarkMode={toggleDarkMode}
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

