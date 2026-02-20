export default function PanduanPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          Panduan Pengguna
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Panduan ringkas penggunaan aplikasi IT HelpDesk untuk pelapor (user)
          dan admin.
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Alur User (Pelapor)
        </h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-600 dark:text-slate-300">
          <li>Buka menu `Lapor Masalah` lalu isi judul, deskripsi, prioritas, dan kategori tiket.</li>
          <li>Klik `Buat Tiket`, lalu Anda akan otomatis diarahkan ke halaman chat tiket.</li>
          <li>Gunakan chat untuk berdiskusi dengan admin sampai masalah selesai.</li>
          <li>Jika admin sudah menutup tiket, kirim feedback rating bintang agar bisa membuat tiket baru lagi.</li>
          <li>Cek riwayat tiket pada halaman `Dashboard` untuk memantau status tiket sebelumnya.</li>
        </ol>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Alur Admin
        </h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-600 dark:text-slate-300">
          <li>Login di halaman admin menggunakan akun yang terdaftar.</li>
          <li>Gunakan panel queue untuk filter tiket berdasarkan status, assignment, prioritas, kata kunci, atau tanggal.</li>
          <li>Klik tiket untuk melihat detail, lalu balas chat user dari panel kanan.</li>
          <li>Status tiket bisa diubah langsung dari dropdown status pada detail tiket.</li>
          <li>Unduh laporan dari tombol `Download Laporan` sesuai filter aktif.</li>
          <li>Kelola akun admin di menu `Kelola Admin` (tambah, edit nama, reset password, hapus admin).</li>
        </ol>
      </section>

      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-500/30 dark:bg-amber-500/10">
        <h2 className="text-lg font-bold text-amber-800 dark:text-amber-200">
          Catatan Penting
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-amber-900 dark:text-amber-100">
          <li>User tidak bisa mengirim pesan pada tiket yang sudah `CLOSED`.</li>
          <li>User tidak bisa membuat tiket baru jika masih ada tiket aktif atau tiket selesai tanpa feedback.</li>
          <li>Realtime chat menggunakan SSE, jadi pastikan koneksi internet stabil saat penggunaan.</li>
        </ul>
      </section>
    </div>
  );
}
