import React from "react";
import { Ticket, Search, Info, Sun, Moon } from "lucide-react";

interface NavbarProps {
  onNavigate: (page: string) => void;
  activePage: string;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

export const SimpleNavbar = ({ onNavigate, activePage, isDarkMode, toggleDarkMode }: NavbarProps) => {
  return (
    <nav className="bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-900 sticky top-0 z-50 transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-6 h-18 flex items-center justify-between">
        <div 
          className="flex items-center gap-2 cursor-pointer" 
          onClick={() => onNavigate("home")}
        >
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-200 dark:shadow-blue-900/20">
            <Ticket className="text-white size-5" />
          </div>
          <span className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">HelpDesk IT</span>
        </div>

        <div className="hidden md:flex items-center gap-8">
          <button 
            onClick={() => onNavigate("home")}
            className={`text-sm font-medium transition-colors ${activePage === "home" ? "text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"}`}
          >
            Beranda
          </button>
          <button 
            onClick={() => onNavigate("create")}
            className={`text-sm font-medium transition-colors ${activePage === "create" ? "text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"}`}
          >
            Lapor Masalah
          </button>
          <button 
            onClick={() => onNavigate("dashboard")}
            className={`text-sm font-medium transition-colors ${activePage === "dashboard" ? "text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"}`}
          >
            Statistik Layanan
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full text-xs font-medium text-slate-500 dark:text-slate-400">
            <Info className="size-3.5" />
            <span>Tanpa Login</span>
          </div>
          
          <button 
            onClick={toggleDarkMode}
            className="p-2 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800"
            aria-label="Toggle dark mode"
          >
            {isDarkMode ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </button>
          
          <button className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300">
            <Search className="size-5" />
          </button>
        </div>
      </div>
    </nav>
  );
};

