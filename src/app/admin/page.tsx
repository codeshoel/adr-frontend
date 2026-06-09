"use client";
import { useEffect, useMemo, useState } from "react";
import { UserPlus, Search, Pencil, RotateCcw, Filter, Users as UsersIcon } from "lucide-react";
import { usersApi } from "@/lib/api/users";
import { UserFormModal } from "@/components/admin/UserFormModal";
import { ROLE_LABELS } from "@/lib/constants";
import { formatDateTime, getApiErrorMessage } from "@/lib/utils";
import type { User, UserRole } from "@/types";

const ROLE_OPTIONS: UserRole[] = [
  "atc_operator", "supervisor", "nama_management", "ncaa_officer",
  "faan_officer", "airline_user", "executive", "system_admin",
];

export default function AdminPage() {
  const [tab, setTab] = useState<"users" | "aerodromes" | "reference">("users");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "">("");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  async function loadUsers() {
    setLoading(true);
    setError("");
    try {
      const params: Parameters<typeof usersApi.list>[0] = { page: 1, page_size: 200 };
      if (roleFilter) params.role = roleFilter;
      if (activeFilter !== "all") params.is_active = activeFilter === "active";
      const { data } = await usersApi.list(params);
      setUsers(data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load users"));
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (tab === "users") loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, roleFilter, activeFilter]);

  // Client-side text search (the backend doesn't have a search param)
  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      u.full_name.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  }, [users, search]);

  function handleOpenCreate() {
    setEditingUser(null);
    setModalOpen(true);
  }

  function handleOpenEdit(user: User) {
    setEditingUser(user);
    setModalOpen(true);
  }

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      {/* Tab nav */}
      <div className="flex gap-2">
        {(["users", "aerodromes", "reference"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-widest transition-colors ${
              tab === t ? "bg-navy-500 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === "users" && (
        <>
          {/* Header + actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-8 bg-amber-adr rounded-sm" />
              <div>
                <h2 className="text-xl font-bold text-navy-700">User Management</h2>
                <p className="text-xs text-gray-500 uppercase tracking-widest mt-0.5">
                  {filteredUsers.length} of {users.length} users shown
                </p>
              </div>
            </div>
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold uppercase text-xs tracking-widest px-4 py-2 rounded transition-colors"
            >
              <UserPlus size={14} />
              New User
            </button>
          </div>

          {/* Filter bar */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-5">
                <Label>Search</Label>
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Name, username, or email…"
                    className="w-full pl-7 pr-3 py-2 border-l-4 border-l-navy-500 border-y border-r border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 rounded-r-md"
                  />
                </div>
              </div>

              <div className="col-span-3">
                <Label>Role</Label>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as UserRole | "")}
                  className="w-full px-3 py-2 border-l-4 border-l-purple-500 border-y border-r border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 rounded-r-md"
                >
                  <option value="">All roles</option>
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
              </div>

              <div className="col-span-3">
                <Label>Status</Label>
                <select
                  value={activeFilter}
                  onChange={(e) => setActiveFilter(e.target.value as typeof activeFilter)}
                  className="w-full px-3 py-2 border-l-4 border-l-emerald-500 border-y border-r border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 rounded-r-md"
                >
                  <option value="all">All</option>
                  <option value="active">Active only</option>
                  <option value="inactive">Inactive only</option>
                </select>
              </div>

              <div className="col-span-1 flex items-end">
                <button
                  onClick={() => { setSearch(""); setRoleFilter(""); setActiveFilter("all"); }}
                  disabled={!search && !roleFilter && activeFilter === "all"}
                  title="Reset filters"
                  className="w-full flex items-center justify-center px-2 py-2 border border-gray-200 rounded text-xs font-bold uppercase tracking-widest text-gray-500 hover:bg-gray-50 disabled:opacity-40"
                >
                  <RotateCcw size={12} />
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 px-3 py-2 rounded">
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          {/* Users table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-left text-[10px] text-gray-500 uppercase tracking-widest">
                  <th className="px-5 py-3">Name</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Last Login</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={7} className="text-center text-sm text-gray-400 py-8">Loading…</td></tr>
                )}

                {!loading && filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-12">
                      <UsersIcon size={28} className="text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">No users found</p>
                    </td>
                  </tr>
                )}

                {filteredUsers.map((u) => (
                  <tr key={u.id} className="border-t border-gray-100 hover:bg-navy-50">
                    <td className="px-5 py-3 font-medium text-gray-800">{u.full_name}</td>
                    <td className="text-xs font-mono text-gray-500">{u.username}</td>
                    <td className="text-xs text-gray-500">{u.email}</td>
                    <td>
                      <span className="text-[10px] bg-navy-50 text-navy-700 px-2 py-0.5 rounded font-bold tracking-widest uppercase">
                        {ROLE_LABELS[u.role]}
                      </span>
                    </td>
                    <td>
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${
                        u.is_active ? "text-emerald-600" : "text-red-500"
                      }`}>
                        ● {u.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="text-[10px] text-gray-400 font-mono">
                      {u.last_login ? formatDateTime(u.last_login) : "Never"}
                    </td>
                    <td>
                      <button
                        onClick={() => handleOpenEdit(u)}
                        className="flex items-center gap-1 px-2 py-1 text-xs font-bold uppercase tracking-widest text-navy-500 hover:bg-navy-50 rounded"
                      >
                        <Pencil size={11} />
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <UserFormModal
            open={modalOpen}
            user={editingUser}
            onClose={() => setModalOpen(false)}
            onSaved={loadUsers}
          />
        </>
      )}

      {tab === "aerodromes" && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-navy-700 mb-2">Aerodrome Registry</h2>
          <p className="text-sm text-gray-500">View and edit Nigerian aerodromes seeded in the database.</p>
          <p className="text-xs text-gray-400 mt-3">
            API: <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">GET/POST /api/v1/aerodromes/</code>
          </p>
        </div>
      )}

      {tab === "reference" && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-bold text-navy-700">Reference Data</h2>
          <div>
            <h3 className="text-sm font-bold text-gray-700">Airlines</h3>
            <p className="text-xs text-gray-400">
              <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">GET/POST /api/v1/airlines/</code>
            </p>
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-700">Aircraft Types</h3>
            <p className="text-xs text-gray-400">
              <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">GET/POST /api/v1/aircraft/</code>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
      {children}
    </label>
  );
}
