"use client";
import { useEffect, useMemo, useState } from "react";
import { Bell, CheckCheck, Mail, Webhook, Inbox, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { notificationsApi } from "@/lib/api/notifications";
import { useNotificationStore } from "@/store/notifications.store";
import { formatDateTime, getApiErrorMessage } from "@/lib/utils";
import type { Notification } from "@/types";

const EVENT_LABELS: Record<string, { label: string; color: string }> = {
  "movement.flagged":  { label: "Movement flagged",   color: "bg-amber-100 text-amber-800" },
  "movement.approved": { label: "Movement approved",  color: "bg-emerald-100 text-emerald-800" },
  "movement.rejected": { label: "Movement rejected",  color: "bg-red-100 text-red-800" },
  "report.ready":      { label: "Report ready",       color: "bg-blue-100 text-blue-800" },
};

export default function NotificationsPage() {
  const router = useRouter();
  const { fetchUnreadCount } = useNotificationStore();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const { data } = await notificationsApi.list(filter === "unread");
      setItems(data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load notifications"));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function handleMarkRead(n: Notification) {
    if (n.is_read) return openNotification(n);
    try {
      await notificationsApi.markRead(n.id);
      setItems((prev) => prev.map((x) => x.id === n.id ? { ...x, is_read: true } : x));
      fetchUnreadCount();
    } catch {
      // ignore
    }
    openNotification(n);
  }

  function openNotification(n: Notification) {
    // Navigate to the related entity for movement.* events.
    if (n.event_type.startsWith("movement.") && n.entity_id) {
      // Best-effort: send the user back to the operator page where
      // clicking a row opens the same modal. For supervisors, send to /supervisor.
      router.push("/operator/history");
    }
  }

  async function handleMarkAllRead() {
    try {
      await notificationsApi.markAllRead();
      setItems((prev) => prev.map((x) => ({ ...x, is_read: true })));
      fetchUnreadCount();
    } catch {
      // ignore
    }
  }

  const unreadCount = useMemo(() => items.filter((n) => !n.is_read).length, [items]);

  return (
    <div className="p-6 space-y-5 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-8 bg-amber-adr rounded-sm" />
          <div>
            <h2 className="text-xl font-bold text-navy-700">Inbox</h2>
            <p className="text-xs text-gray-500 uppercase tracking-widest mt-0.5">
              {unreadCount > 0 ? `${unreadCount} unread` : "All read"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-white border border-gray-200 rounded-lg p-1 flex gap-1">
            {(["all", "unread"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs font-bold uppercase tracking-widest rounded transition-colors ${
                  filter === f ? "bg-navy-500 text-white" : "text-gray-500 hover:bg-gray-50"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold uppercase tracking-widest text-navy-500 hover:bg-navy-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-adr text-navy-700 hover:bg-yellow-400 font-bold uppercase text-xs tracking-widest rounded transition-colors"
            >
              <CheckCheck size={12} />
              Mark all read
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 px-4 py-3 rounded">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Notification list */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {loading && items.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-12">Loading…</p>
        )}

        {!loading && items.length === 0 && (
          <div className="text-center py-16">
            <Inbox size={32} className="text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">
              {filter === "unread" ? "No unread notifications" : "Your inbox is empty"}
            </p>
          </div>
        )}

        <ul className="divide-y divide-gray-100">
          {items.map((n) => {
            const event = EVENT_LABELS[n.event_type];
            const ChannelIcon = n.channel === "email" ? Mail : n.channel === "webhook" ? Webhook : Bell;
            return (
              <li
                key={n.id}
                onClick={() => handleMarkRead(n)}
                className={`px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors border-l-4 ${
                  n.is_read ? "border-l-transparent bg-white" : "border-l-amber-adr bg-amber-50/30"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center ${
                    n.is_read ? "bg-gray-100 text-gray-400" : "bg-navy-50 text-navy-500"
                  }`}>
                    <ChannelIcon size={14} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm ${n.is_read ? "font-medium text-gray-700" : "font-bold text-navy-700"}`}>
                          {n.title}
                        </p>
                        {event && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold tracking-wider uppercase ${event.color}`}>
                            {event.label}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {formatDateTime(n.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{n.body}</p>
                  </div>

                  {!n.is_read && (
                    <span className="mt-2 w-2 h-2 rounded-full bg-amber-adr flex-shrink-0" />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
