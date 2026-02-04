import React from "react";
import { PlusCircle, Search, HelpCircle, ShieldCheck, Clock, Zap } from "lucide-react";

interface LandingPageProps {
  onCreateClick: () => void;
  onDashboardClick: () => void;
}

export const LandingPage = ({ onCreateClick, onDashboardClick }: LandingPageProps) => {
  return (
    <div className="space-y-16 py-8 animate-in fade-in duration-700">
      <div className="text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Ada Kendala IT? Kami Siap Membantu.
        </h1>
        <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Portal layanan mandiri untuk melaporkan masalah teknis, permintaan perangkat, atau bantuan jaringan di kantor Anda.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        <div 
          onClick={onCreateClick}
          className="group bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-blue-200 dark:hover:border-blue-900 transition-all cursor-pointer relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <PlusCircle className="size-24 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="w-14 h-14 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-600 dark:group-hover:bg-blue-500 group-hover:text-white transition-colors">
            <PlusCircle className="size-8" />
          </div>
          <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Lapor Masalah Baru</h3>
          <p className="text-slate-500 dark:text-slate-400 leading-relaxed">Buat tiket baru untuk mendapatkan bantuan teknis dari tim IT kami.</p>
          <div className="mt-6 flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold group-hover:translate-x-2 transition-transform">
            Mulai Lapor Sekarang <span>→</span>
          </div>
        </div>

        <div 
          onClick={onDashboardClick}
          className="group bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-emerald-200 dark:hover:border-emerald-900 transition-all cursor-pointer relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Search className="size-24 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-emerald-600 dark:group-hover:bg-emerald-500 group-hover:text-white transition-colors">
            <Search className="size-8" />
          </div>
          <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Cek Status & Statistik</h3>
          <p className="text-slate-500 dark:text-slate-400 leading-relaxed">Pantau perkembangan tiket Anda atau lihat performa layanan kami secara publik.</p>
          <div className="mt-6 flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold group-hover:translate-x-2 transition-transform">
            Lihat Dashboard Publik <span>→</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-5xl mx-auto border-t border-slate-100 dark:border-slate-900 pt-16">
        <div className="flex flex-col items-center text-center space-y-3 p-4">
          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-full text-slate-600 dark:text-slate-400">
            <Clock className="size-6" />
          </div>
          <h4 className="font-bold text-slate-800 dark:text-white">Respons Cepat</h4>
          <p className="text-sm text-slate-500 dark:text-slate-400">Tim kami merespons setiap tiket dalam kurun waktu kurang dari 30 menit.</p>
        </div>
        <div className="flex flex-col items-center text-center space-y-3 p-4">
          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-full text-slate-600 dark:text-slate-400">
            <ShieldCheck className="size-6" />
          </div>
          <h4 className="font-bold text-slate-800 dark:text-white">Tanpa Login</h4>
          <p className="text-sm text-slate-500 dark:text-slate-400">Tidak perlu repot mengingat password. Cukup masukkan nama dan lokasi.</p>
        </div>
        <div className="flex flex-col items-center text-center space-y-3 p-4">
          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-full text-slate-600 dark:text-slate-400">
            <Zap className="size-6" />
          </div>
          <h4 className="font-bold text-slate-800 dark:text-white">Status Real-time</h4>
          <p className="text-sm text-slate-500 dark:text-slate-400">Dapatkan update langsung mengenai status perbaikan masalah Anda.</p>
        </div>
      </div>

      <div className="bg-slate-900 dark:bg-blue-600 rounded-3xl p-8 text-center text-white max-w-4xl mx-auto transition-colors">
        <div className="flex flex-col items-center gap-4">
          <HelpCircle className="size-10 text-blue-400 dark:text-white opacity-80" />
          <h3 className="text-xl font-bold">Butuh bantuan darurat?</h3>
          <p className="text-slate-400 dark:text-blue-50 max-w-md">Untuk masalah kritis yang menghentikan operasional satu divisi, silakan hubungi Hotline IT di : +6285155477496.</p>
        </div>
      </div>
    </div>
  );
};

