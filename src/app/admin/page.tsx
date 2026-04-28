"use client";
import { useEffect, useState } from "react";
import client from "@/lib/api/client";
import { ROLE_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import type { User } from "@/types";

export default function AdminPage() {
  const [tab, setTab] = useState<"users" | "aerodromes" | "reference">("users");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tab === "users") {
      setLoading(true);
      client.get("/users/").then(({ data }) => setUsers(data)).finally(() => setLoading(false));
    }
  }, [tab]);

  return (
    <div className="p-6">
      <div className="flex gap-2 mb-6">
        {(["users", "aerodromes", "reference"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? "bg-navy-500 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === "users" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">System Users ({users.length})</h3>
            <span className="text-xs text-gray-400">Use the API to create users: POST /api/v1/users/</span>
          </div>
          {loading ? (
            <p className="text-center text-gray-400 py-8">Loading…</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-xs text-gray-500">
                  <th className="px-4 py-3">Name</th>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Aerodrome</th>
                  <th>Status</th>
                  <th>Last Login</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{u.full_name}</td>
                    <td className="text-gray-500 font-mono text-xs">{u.username}</td>
                    <td>
                      <span className="text-xs bg-navy-50 text-navy-600 px-2 py-0.5 rounded-full font-medium">
                        {ROLE_LABELS[u.role]}
                      </span>
                    </td>
                    <td className="text-xs text-gray-500">{u.aerodrome_id ? "Assigned" : "—"}</td>
                    <td>
                      <span className={`text-xs font-medium ${u.is_active ? "text-green-600" : "text-red-500"}`}>
                        {u.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="text-xs text-gray-400">{formatDateTime(u.last_login)}</td>
                  </tr>
                ))}
                {users.length === 0 && !loading && (
                  <tr><td colSpan={6} className="text-center text-gray-400 py-8">No users found</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "aerodromes" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <p className="text-sm text-gray-500 mb-2">Aerodrome registry management.</p>
          <p className="text-xs text-gray-400">API: <code className="bg-gray-100 px-1 rounded">GET/POST /api/v1/aerodromes/</code></p>
        </div>
      )}

      {tab === "reference" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-3">
          <div>
            <h4 className="text-sm font-semibold text-gray-700">Airlines</h4>
            <p className="text-xs text-gray-400 mt-1"><code className="bg-gray-100 px-1 rounded">GET/POST /api/v1/airlines/</code></p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-700">Aircraft Types</h4>
            <p className="text-xs text-gray-400 mt-1"><code className="bg-gray-100 px-1 rounded">GET/POST /api/v1/aircraft/</code></p>
          </div>
        </div>
      )}
    </div>
  );
}
