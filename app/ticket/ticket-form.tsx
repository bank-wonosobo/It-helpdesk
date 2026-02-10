import React, { useState } from "react";
import { Send, User, MapPin, Tag, AlertTriangle, FileText, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface TicketFormProps {
  onBack: () => void;
  onSuccess: (ticketId: string, data: any) => void;
}

export const TicketForm = ({ onBack, onSuccess }: TicketFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    location: "",
    title: "",
    category: "Hardware (Monitor, PC, Printer)",
    urgency: "Biasa - Tidak mengganggu pekerjaan",
    detail: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const priorityMap: Record<string, string> = {
      "Biasa - Tidak mengganggu pekerjaan": "LOW",
      "Penting - Pekerjaan agak terhambat": "MEDIUM",
      "Mendesak - Tidak bisa bekerja sama sekali": "HIGH"
    }

    const categoryMap: Record<string, string> = {
      "Hardware (Monitor, PC, Printer)": "HARDWARE",
      "Software (OS, Office, Aplikasi)": "SOFTWARE",
      "Internet & Jaringan" : "NETWORK",
      "Email & Akun" : "ACCOUNT",
      "Lainnya" : "OTHER"
    }

    const payload = {
      title: formData.title,
      description: formData.detail,
      priority: priorityMap[formData.urgency] || "MEDIUM",
      category: categoryMap[formData.category] || "HARDWARE",
    }
    
    try{
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(payload)
      })

      if (!res.ok){
        const errorData = await res.json();
        throw new Error(errorData.error || "Gagal membuat tiket");
      }

      const ticket = await res.json();
      toast.success("Laporan Berhasil Dikirimkan !");
      onSuccess(ticket.id, formData);
    }catch (err: any){
      toast.error("Error : " + err.message)
    }finally{
      setIsSubmitting(false)
    }

    setTimeout(() => {
      const generatedId = `TIC-${Math.floor(1000 + Math.random() * 9000)}`;
      setIsSubmitting(false);
      toast.success("Laporan Berhasil Dikirim!", {
        description: `Mohon catat ID Tiket Anda: ${generatedId}`,
      });
      onSuccess(generatedId, formData);
    }, 1500);
  };

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors mb-6 text-sm font-medium"
      >
        <ArrowLeft className="size-4" />
        Kembali ke Beranda
      </button>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-black/20 overflow-hidden">
        <div className="bg-blue-600 p-8 text-white">
          <h2 className="text-2xl font-bold">Lapor Kendala IT</h2>
          <p className="text-blue-100 mt-1 opacity-90">Sertakan detail masalah Anda agar kami dapat membantu lebih cepat.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <User className="size-4 text-blue-500" />
                Nama Pelapor
              </label>
              <input 
                required
                type="text" 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Masukkan nama lengkap" 
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-slate-900 dark:text-white transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <MapPin className="size-4 text-blue-500" />
                Lokasi Kantor / Ruangan
              </label>
              <input 
                required
                type="text" 
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                placeholder="Contoh: Lt. 3, Ruang Rapat" 
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-slate-900 dark:text-white transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Tag className="size-4 text-blue-500" />
              Judul Masalah
            </label>
            <input 
              required
              type="text" 
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              placeholder="Apa kendala yang Anda alami?" 
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-slate-900 dark:text-white transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <FileText className="size-4 text-blue-500" />
                Kategori
              </label>
              <select 
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-slate-900 dark:text-white transition-all appearance-none cursor-pointer"
              >
                <option className="bg-white dark:bg-slate-900">Hardware (Monitor, PC, Printer)</option>
                <option className="bg-white dark:bg-slate-900">Software (OS, Office, Aplikasi)</option>
                <option className="bg-white dark:bg-slate-900">Internet & Jaringan</option>
                <option className="bg-white dark:bg-slate-900">Email & Akun</option>
                <option className="bg-white dark:bg-slate-900">Lainnya</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <AlertTriangle className="size-4 text-blue-500" />
                Seberapa Mendesak?
              </label>
              <select 
                value={formData.urgency}
                onChange={(e) => setFormData({...formData, urgency: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-slate-900 dark:text-white transition-all appearance-none cursor-pointer"
              >
                <option className="bg-white dark:bg-slate-900">Biasa - Tidak mengganggu pekerjaan</option>
                <option className="bg-white dark:bg-slate-900">Penting - Pekerjaan agak terhambat</option>
                <option className="bg-white dark:bg-slate-900">Mendesak - Tidak bisa bekerja sama sekali</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Detail Masalah</label>
            <textarea 
              required
              rows={4}
              value={formData.detail}
              onChange={(e) => setFormData({...formData, detail: e.target.value})}
              placeholder="Ceritakan kronologi atau detail masalah yang terjadi..." 
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-slate-900 dark:text-white transition-all resize-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
            ></textarea>
          </div>

          <button 
            type="submit"
            disabled={isSubmitting}
            className={`w-full flex items-center justify-center gap-3 px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/25 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed`}
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Mengirim Laporan...
              </>
            ) : (
              <>
                <Send className="size-5" />
                Kirim Laporan IT
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

