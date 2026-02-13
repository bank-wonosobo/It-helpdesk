"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Users } from "lucide-react";
import { toast } from "sonner";

type AdminUserItem = {
  id: string;
  username: string;
  name: string;
  active: boolean;
  createdAt: string;
};

type SessionResponse = {
  authenticated: boolean;
  user?: string;
};

export default function AdminUsersPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [adminUser, setAdminUser] = useState<string | null>(null);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminUsername, setNewAdminUsername] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [creating, setCreating] = useState(false);

  const checkSession = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/session");
      const data = (await res.json()) as SessionResponse;
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

  const loadUsers = useCallback(async () => {
    if (!authenticated) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users");
      const data = (await res.json()) as { items?: AdminUserItem[]; error?: string };
      if (!res.ok || !Array.isArray(data.items)) {
        setError(data.error || "Gagal memuat daftar admin.");
        setUsers([]);
        return;
      }
      setUsers(data.items);
    } catch {
      setError("Koneksi terputus saat memuat daftar admin.");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [authenticated]);

  useEffect(() => {
    void checkSession();
  }, [checkSession]);

  useEffect(() => {
    if (!authenticated) return;
    void loadUsers();
  }, [authenticated, loadUsers]);

  const submitCreateAdmin = async () => {
    if (!newAdminName.trim() || !newAdminUsername.trim() || !newAdminPassword.trim()) {
      toast.error("Nama, username, dan password wajib diisi.");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newAdminName.trim(),
          username: newAdminUsername.trim(),
          password: newAdminPassword,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(data.error || "Gagal menambah admin.");
        return;
      }

      toast.success("Admin baru berhasil ditambahkan.");
      setNewAdminName("");
      setNewAdminUsername("");
      setNewAdminPassword("");
      await loadUsers();
    } catch {
      toast.error("Koneksi terputus saat menambah admin.");
    } finally {
      setCreating(false);
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
      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Sesi admin tidak aktif. Masuk dulu dari dashboard admin.
        </p>
        <button
          type="button"
          onClick={() => router.push("/admin")}
          className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
        >
          Ke Admin Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Manajemen Admin</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Login sebagai: <span className="font-semibold">{adminUser}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/admin")}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Kembali ke Dashboard
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[390px_minmax(0,1fr)] xl:h-[calc(100vh-220px)]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col min-h-0">
          <div className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
            <UserPlus className="size-4 text-blue-500" />
            Tambah Admin Baru
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Nama Lengkap</p>
              <input
                value={newAdminName}
                onChange={(e) => setNewAdminName(e.target.value)}
                placeholder="Contoh: Hanabi Putri"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Username Login</p>
              <input
                value={newAdminUsername}
                onChange={(e) => setNewAdminUsername(e.target.value)}
                placeholder="Contoh: hanabi"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Password</p>
              <input
                type="password"
                value={newAdminPassword}
                onChange={(e) => setNewAdminPassword(e.target.value)}
                placeholder="Minimal 4 karakter"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Akun baru langsung aktif setelah dibuat.
            </p>
            <button
              type="button"
              onClick={submitCreateAdmin}
              disabled={creating}
              className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {creating ? "Menyimpan..." : "Tambah Admin"}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col min-h-0">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-blue-500" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Daftar Admin</h3>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {users.length}
              </span>
            </div>
            <button
              type="button"
              onClick={loadUsers}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Reload
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
            {loading && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Memuat daftar admin...
              </p>
            )}
            {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
            {!loading &&
              !error &&
              users.map((admin) => (
                <div
                  key={admin.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                >
                  <div className="space-y-0.5">
                    <p className="font-semibold text-slate-700 dark:text-slate-200">{admin.name}</p>
                    <p className="text-slate-500 dark:text-slate-400">@{admin.username}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">
                      Dibuat{" "}
                      {new Date(admin.createdAt).toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      admin.active
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                        : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {admin.active ? "ACTIVE" : "INACTIVE"}
                  </span>
                </div>
              ))}
            {!loading && !error && users.length === 0 && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Belum ada admin terdaftar.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
