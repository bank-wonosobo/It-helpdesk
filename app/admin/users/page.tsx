"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Users } from "lucide-react";
import { toast } from "sonner";

type AdminUserItem = {
  id: string;
  username: string;
  name: string;
  active: boolean;
  isOnline: boolean;
  createdAt: string;
  updatedAt?: string;
};

type SessionResponse = {
  authenticated: boolean;
  user?: string;
  username?: string;
};

type AdminPresenceEvent = {
  id: string;
  adminId: string;
  username: string;
  name: string;
  active: boolean;
  isOnline: boolean;
  createdAt: string;
  updatedAt: string;
};

const sortAdminUsers = (items: AdminUserItem[]) =>
  [...items].sort((a, b) => {
    if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
    if (a.active !== b.active) return a.active ? -1 : 1;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

export default function AdminUsersPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [adminUser, setAdminUser] = useState<string | null>(null);
  const [adminUsername, setAdminUsername] = useState<string | null>(null);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminUsername, setNewAdminUsername] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingAdminId, setEditingAdminId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [resettingAdminId, setResettingAdminId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [deletingAdminId, setDeletingAdminId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const lastPresenceAtRef = useRef<string>(new Date(0).toISOString());

  const checkSession = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/session");
      const data = (await res.json()) as SessionResponse;
      if (res.ok && data.authenticated && data.user) {
        setAuthenticated(true);
        setAdminUser(data.user);
        setAdminUsername(data.username || null);
      } else {
        setAuthenticated(false);
        setAdminUser(null);
        setAdminUsername(null);
      }
    } catch {
      setAuthenticated(false);
      setAdminUser(null);
      setAdminUsername(null);
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
      setUsers(sortAdminUsers(data.items));
      const latest = data.items.reduce<string | null>((acc, item) => {
        if (!item.updatedAt) return acc;
        if (!acc) return item.updatedAt;
        return new Date(item.updatedAt) > new Date(acc) ? item.updatedAt : acc;
      }, null);
      if (latest) {
        lastPresenceAtRef.current = latest;
      }
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

  useEffect(() => {
    if (!authenticated) return;
    const source = new EventSource(
      `/api/admin/users/stream?after=${encodeURIComponent(lastPresenceAtRef.current)}`
    );

    source.addEventListener("presence", (event) => {
      try {
        const payload = JSON.parse(
          (event as MessageEvent<string>).data
        ) as AdminPresenceEvent;
        if (
          !payload ||
          typeof payload.adminId !== "string" ||
          typeof payload.username !== "string" ||
          typeof payload.updatedAt !== "string"
        ) {
          return;
        }

        lastPresenceAtRef.current = payload.updatedAt;
        setUsers((prev) => {
          const next = [...prev];
          const index = next.findIndex((item) => item.id === payload.adminId);
          const mapped: AdminUserItem = {
            id: payload.adminId,
            username: payload.username,
            name: payload.name,
            active: payload.active,
            isOnline: payload.isOnline,
            createdAt: payload.createdAt,
            updatedAt: payload.updatedAt,
          };

          if (index >= 0) {
            next[index] = { ...next[index], ...mapped };
          } else {
            next.push(mapped);
          }
          return sortAdminUsers(next);
        });
      } catch {
        // Ignore malformed stream payloads.
      }
    });

    return () => {
      source.close();
    };
  }, [authenticated]);

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

  const patchAdminUser = useCallback(
    async (
      adminId: string,
      payload: { name?: string; password?: string; active?: boolean },
      successMessage: string
    ) => {
      setActionLoadingId(adminId);
      try {
        const res = await fetch(`/api/admin/users/${adminId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) {
          toast.error(data.error || "Gagal update admin.");
          return false;
        }
        toast.success(successMessage);
        await checkSession();
        await loadUsers();
        return true;
      } catch {
        toast.error("Koneksi terputus saat update admin.");
        return false;
      } finally {
        setActionLoadingId(null);
      }
    },
    [checkSession, loadUsers]
  );

  const deleteAdminUser = useCallback(
    async (adminId: string) => {
      setActionLoadingId(adminId);
      try {
        const res = await fetch(`/api/admin/users/${adminId}`, {
          method: "DELETE",
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) {
          toast.error(data.error || "Gagal menghapus admin.");
          return false;
        }
        toast.success("Admin berhasil dihapus.");
        await loadUsers();
        return true;
      } catch {
        toast.error("Koneksi terputus saat menghapus admin.");
        return false;
      } finally {
        setActionLoadingId(null);
      }
    },
    [loadUsers]
  );

  const filteredUsers = users.filter((admin) => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return true;
    return (
      admin.name.toLowerCase().includes(keyword) ||
      admin.username.toLowerCase().includes(keyword)
    );
  });

  if (!authChecked) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        Memeriksa sesi admin...
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Sesi admin tidak aktif. Masuk dulu dari dashboard admin.
        </p>
        <button
          type="button"
          onClick={() => router.push("/admin")}
          className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
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
                placeholder="Contoh: Hanabi"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Username Login</p>
              <input
                value={newAdminUsername}
                onChange={(e) => setNewAdminUsername(e.target.value)}
                placeholder="Contoh: rahasia"
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
                {filteredUsers.length}/{users.length}
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
          <div className="mb-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama / username admin..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
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
              filteredUsers.map((admin) => {
                const isSelf = admin.username === adminUsername;
                const isEditing = editingAdminId === admin.id;
                const isResetting = resettingAdminId === admin.id;
                const isDeleting = deletingAdminId === admin.id;
                const isBusy = actionLoadingId === admin.id;
                return (
                <div
                  key={admin.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <p className="font-semibold text-slate-700 dark:text-slate-200">
                        {admin.name}{" "}
                        {isSelf && (
                          <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                            You
                          </span>
                        )}
                      </p>
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
                        admin.isOnline
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                          : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {admin.isOnline ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => {
                        setResettingAdminId(null);
                        setResetPassword("");
                        setDeletingAdminId(null);
                        if (isEditing) {
                          setEditingAdminId(null);
                          setEditingName("");
                          return;
                        }
                        setEditingAdminId(admin.id);
                        setEditingName(admin.name);
                      }}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      {isEditing ? "Batal Edit" : "Edit Nama"}
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => {
                        setEditingAdminId(null);
                        setEditingName("");
                        setDeletingAdminId(null);
                        if (isResetting) {
                          setResettingAdminId(null);
                          setResetPassword("");
                          return;
                        }
                        setResettingAdminId(admin.id);
                        setResetPassword("");
                      }}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      {isResetting ? "Batal Reset" : "Reset Password"}
                    </button>
                    <button
                      type="button"
                      disabled={isBusy || isSelf}
                      onClick={() => {
                        setEditingAdminId(null);
                        setEditingName("");
                        setResettingAdminId(null);
                        setResetPassword("");
                        if (isDeleting) {
                          setDeletingAdminId(null);
                          return;
                        }
                        setDeletingAdminId(admin.id);
                      }}
                      className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-[10px] font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
                    >
                      {isDeleting ? "Batal Hapus" : "Hapus Admin"}
                    </button>
                  </div>

                  {isEditing && (
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        placeholder="Nama baru admin"
                        className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={async () => {
                          if (editingName.trim().length < 2) {
                            toast.error("Nama minimal 2 karakter.");
                            return;
                          }
                          const ok = await patchAdminUser(
                            admin.id,
                            { name: editingName.trim() },
                            "Nama admin berhasil diubah."
                          );
                          if (ok) {
                            setEditingAdminId(null);
                            setEditingName("");
                          }
                        }}
                        className="rounded-lg bg-blue-600 px-2.5 py-1.5 text-[10px] font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                      >
                        Simpan
                      </button>
                    </div>
                  )}

                  {isResetting && (
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="password"
                        value={resetPassword}
                        onChange={(e) => setResetPassword(e.target.value)}
                        placeholder="Password baru (min 4)"
                        className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={async () => {
                          if (resetPassword.trim().length < 4) {
                            toast.error("Password minimal 4 karakter.");
                            return;
                          }
                          const ok = await patchAdminUser(
                            admin.id,
                            { password: resetPassword },
                            "Password admin berhasil direset."
                          );
                          if (ok) {
                            setResettingAdminId(null);
                            setResetPassword("");
                          }
                        }}
                        className="rounded-lg bg-blue-600 px-2.5 py-1.5 text-[10px] font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                      >
                        Simpan
                      </button>
                    </div>
                  )}

                  {isDeleting && (
                    <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 dark:border-red-500/30 dark:bg-red-500/10">
                      <p className="text-[11px] font-medium text-red-700 dark:text-red-300">
                        Yakin hapus admin ini? Aksi ini tidak bisa dibatalkan.
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={async () => {
                            const ok = await deleteAdminUser(admin.id);
                            if (ok) {
                              setDeletingAdminId(null);
                            }
                          }}
                          className="rounded-lg bg-red-600 px-2.5 py-1.5 text-[10px] font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                        >
                          Ya, Hapus
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => setDeletingAdminId(null)}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-700"
                        >
                          Batal
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )})}
            {!loading && !error && filteredUsers.length === 0 && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {users.length === 0
                  ? "Belum ada admin terdaftar."
                  : "Tidak ada admin yang cocok dengan pencarian."}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
