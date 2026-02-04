import React from "react";
import { X, Upload, Send } from "lucide-react";
import { toast } from "sonner";

export const NewTicketModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Tiket berhasil dibuat!", {
      description: "Tim IT akan segera meninjau permintaan Anda.",
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h3 className="text-xl font-bold text-slate-800">Buat Tiket Baru</h3>
            <p className="text-sm text-slate-500">Jelaskan masalah IT yang Anda alami secara detail.</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400"
          >
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Judul Masalah</label>
            <input 
              required
              type="text" 
              placeholder="Contoh: Tidak bisa akses printer di lantai 2" 
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Kategori</label>
              <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all">
                <option>Hardware</option>
                <option>Software</option>
                <option>Jaringan</option>
                <option>Keamanan</option>
                <option>Lainnya</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Prioritas</label>
              <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all">
                <option>Rendah</option>
                <option>Medium</option>
                <option>Tinggi</option>
                <option>Mendesak</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Deskripsi Masalah</label>
            <textarea 
              required
              rows={4}
              placeholder="Berikan informasi tambahan seperti kapan masalah mulai terjadi..." 
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
            ></textarea>
          </div>

          <div className="p-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-100/50 transition-colors cursor-pointer group text-center">
            <Upload className="size-6 text-slate-400 mx-auto mb-2 group-hover:text-blue-500 transition-colors" />
            <p className="text-xs font-medium text-slate-600">Lampirkan Screenshot (Opsional)</p>
            <p className="text-[10px] text-slate-400 mt-1">Format PNG, JPG hingga 5MB</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Batal
            </button>
            <button 
              type="submit"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
            >
              <Send className="size-4" />
              Kirim Tiket
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
