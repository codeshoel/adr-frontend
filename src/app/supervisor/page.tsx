"use client";
import { useEffect, useMemo, useState } from "react";
import {
  ClipboardCheck, AlertTriangle, Search, ChevronLeft, ChevronRight, RotateCcw,
} from "lucide-react";
import { movementsApi } from "@/lib/api/movements";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { MovementDetailModal } from "@/components/movements/MovementDetailModal";
import { formatDate } from "@/lib/utils";
import { FLIGHT_TYPE_LABELS } from "@/lib/constants";
import type { FlightType, Movement, MovementStatus } from "@/types";

const PAGE_SIZE = 25;

type StatusFilterValue = "pending" | "all" | MovementStatus;

const STATUS_OPTIONS: { value: StatusFilterValue; label: string }[] = [
  { value: "pending",      label: "Pending Review" },
  { value: "submitted",    label: "Submitted only" },
  { value: "flagged",      label: "Flagged only" },
  { value: "under_review", label: "Under Review" },
  { value: "approved",     label: "Approved" },
  { value: "rejected",     label: "Rejected" },
  { value: "all",          label: "All Statuses" },
];

const FLIGHT_TYPES: { value: FlightType; label: string }[] = [
  { value: "departure",  label: "Departure" },
  { value: "arrival",    label: "Arrival" },
  { value: "overflight", label: "Overflight" },
  { value: "transit",    label: "Transit" },
];

interface FilterState {
  callsign: string;
  date_from: string;
  date_to: string;
  status: StatusFilterValue;
  flight_type: FlightType | "";
}

const EMPTY_FILTERS: FilterState = {
  callsign: "",
  date_from: "",
  date_to: "",
  status: "pending",
  flight_type: "",
};

export default function SupervisorPage() {
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [debouncedCallsign, setDebouncedCallsign] = useState("");
  const [page, setPage] = useState(1);

  const [items, setItems] = useState<Movement[]>([]);
  const [total, setTotal] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [flaggedCount, setFlaggedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedMovementId, setSelectedMovementId] = useState<string | null>(null);

  // Debounce callsign input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedCallsign(filters.callsign), 300);
    return () => clearTimeout(t);
  }, [filters.callsign]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedCallsign, filters.date_from, filters.date_to, filters.status, filters.flight_type]);

  async function loadCounts() {
    try {
      const [submitted, flagged] = await Promise.all([
        movementsApi.list({ status: "submitted", page: 1, page_size: 1 }),
        movementsApi.list({ status: "flagged", page: 1, page_size: 1 }),
      ]);
      setPendingCount(submitted.data.total);
      setFlaggedCount(flagged.data.total);
    } catch {
      // ignore
    }
  }

  async function loadQueue() {
    setLoading(true);
    try {
      const baseParams = {
        callsign: debouncedCallsign || undefined,
        date_from: filters.date_from || undefined,
        date_to: filters.date_to || undefined,
        flight_type: filters.flight_type || undefined,
        page,
        page_size: PAGE_SIZE,
      };

      if (filters.status === "pending") {
        const [submitted, flagged] = await Promise.all([
          movementsApi.list({ ...baseParams, status: "submitted" }),
          movementsApi.list({ ...baseParams, status: "flagged" }),
        ]);
        const combined = [...flagged.data.items, ...submitted.data.items]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setItems(combined);
        setTotal(submitted.data.total + flagged.data.total);
      } else if (filters.status === "all") {
        const { data } = await movementsApi.list(baseParams);
        setItems(data.items);
        setTotal(data.total);
      } else {
        const { data } = await movementsApi.list({ ...baseParams, status: filters.status });
        setItems(data.items);
        setTotal(data.total);
      }
    } catch {
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadCounts(); }, []);

  useEffect(() => {
    loadQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedCallsign, filters.date_from, filters.date_to, filters.status, filters.flight_type, page]);

  function set<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    setFilters((p) => ({ ...p, [key]: value }));
  }

  const hasFilters = useMemo(() =>
    filters.callsign !== "" ||
    filters.date_from !== "" ||
    filters.date_to !== "" ||
    filters.flight_type !== "" ||
    filters.status !== "pending",
  [filters]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          icon={ClipboardCheck}
          title="Submitted — Awaiting Review"
          count={pendingCount}
          color="bg-blue-50 border-blue-300 text-blue-700"
        />
        <StatCard
          icon={AlertTriangle}
          title="Flagged for Review"
          count={flaggedCount}
          color="bg-amber-50 border-amber-300 text-amber-700"
        />
      </div>

      {/* Filter bar */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-3">
            <Label>Callsign</Label>
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={filters.callsign}
                onChange={(e) => set("callsign", e.target.value.toUpperCase())}
                placeholder="ABV1234"
                className="w-full pl-7 pr-3 py-2 border-l-4 border-l-navy-500 border-y border-r border-gray-200 bg-white text-sm font-mono uppercase tracking-wide focus:outline-none focus:ring-2 focus:ring-navy-500 rounded-r-md"
              />
            </div>
          </div>

          <div className="col-span-2">
            <Label>From</Label>
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => set("date_from", e.target.value)}
              className="w-full px-3 py-2 border-l-4 border-l-emerald-500 border-y border-r border-gray-200 bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-navy-500 rounded-r-md"
            />
          </div>

          <div className="col-span-2">
            <Label>To</Label>
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => set("date_to", e.target.value)}
              className="w-full px-3 py-2 border-l-4 border-l-emerald-500 border-y border-r border-gray-200 bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-navy-500 rounded-r-md"
            />
          </div>

          <div className="col-span-3">
            <Label>Status</Label>
            <select
              value={filters.status}
              onChange={(e) => set("status", e.target.value as StatusFilterValue)}
              className="w-full px-3 py-2 border-l-4 border-l-purple-500 border-y border-r border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 rounded-r-md"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div className="col-span-1">
            <Label>Type</Label>
            <select
              value={filters.flight_type}
              onChange={(e) => set("flight_type", e.target.value as FlightType | "")}
              className="w-full px-2 py-2 border-l-4 border-l-sky-500 border-y border-r border-gray-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-navy-500 rounded-r-md"
            >
              <option value="">All</option>
              {FLIGHT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="col-span-1 flex items-end">
            <button
              onClick={() => setFilters(EMPTY_FILTERS)}
              disabled={!hasFilters}
              title="Reset filters"
              className="w-full flex items-center justify-center gap-1 px-2 py-2 border border-gray-200 rounded text-xs font-bold uppercase tracking-widest text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <RotateCcw size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* Queue */}
      <div className="bg-white rounded-xl border-2 border-navy-500 shadow-sm overflow-hidden">
        <div className="bg-navy-500 px-5 py-3 text-white flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest">Review Queue</h2>
            <p className="text-[10px] text-navy-200 mt-0.5">
              {loading ? "Loading…" : `${total.toLocaleString()} movement${total !== 1 ? "s" : ""}`} · Click a row to review
            </p>
          </div>
          {filters.status === "pending" && (
            <span className="text-[10px] bg-amber-adr text-navy-700 px-2 py-1 rounded font-bold uppercase tracking-widest">
              Pending only
            </span>
          )}
        </div>

        {!loading && items.length === 0 && (
          <div className="text-center py-12">
            <ClipboardCheck size={32} className="text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">
              {hasFilters ? "No movements match those filters" : "Queue is empty — all caught up"}
            </p>
          </div>
        )}

        {(loading || items.length > 0) && (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-[10px] text-gray-500 uppercase tracking-widest">
                <th className="px-5 py-3">Callsign</th>
                <th>Type</th>
                <th>Date</th>
                <th>Route</th>
                <th>Entered by</th>
                <th>Aerodrome</th>
                <th>Flags</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && items.length === 0 && (
                <tr><td colSpan={8} className="text-center text-sm text-gray-400 py-8">Loading…</td></tr>
              )}

              {items.map((m) => (
                <tr
                  key={m.id}
                  onClick={() => setSelectedMovementId(m.id)}
                  className="border-t border-gray-100 hover:bg-navy-50 cursor-pointer transition-colors"
                >
                  <td className="px-5 py-3 font-mono font-bold text-navy-700">{m.callsign}</td>
                  <td>
                    <span className="text-[10px] bg-navy-500 text-white px-1.5 py-0.5 rounded font-bold tracking-wider">
                      {FLIGHT_TYPE_LABELS[m.flight_type]}
                    </span>
                  </td>
                  <td className="text-xs text-gray-600">{formatDate(m.movement_date)}</td>
                  <td className="font-mono text-xs text-gray-600">
                    {m.origin_icao ?? "—"} → {m.destination_icao ?? "—"}
                  </td>
                  <td className="text-xs">
                    {m.entered_by?.full_name ? (
                      <span className="text-gray-700">{m.entered_by.full_name}</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="font-mono text-xs">{m.aerodrome?.icao_code ?? "—"}</td>
                  <td>
                    {m.validation_flags.length > 0 ? (
                      <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">
                        {m.validation_flags.length}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                  <td><StatusBadge status={m.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination — only when in single-status mode */}
        {total > PAGE_SIZE && filters.status !== "pending" && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-500">
              Page {page} of {totalPages} · Showing {(page - 1) * PAGE_SIZE + 1}–
              {Math.min(page * PAGE_SIZE, total)} of {total.toLocaleString()}
            </p>
            <div className="flex items-center gap-1">
              <PaginationButton onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                <ChevronLeft size={14} /> Prev
              </PaginationButton>
              <PaginationButton onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                Next <ChevronRight size={14} />
              </PaginationButton>
            </div>
          </div>
        )}
      </div>

      <MovementDetailModal
        movementId={selectedMovementId}
        onClose={() => setSelectedMovementId(null)}
        onChanged={() => { loadQueue(); loadCounts(); }}
      />
    </div>
  );
}

// ===== sub-components =====

function StatCard({ icon: Icon, title, count, color }: { icon: React.ElementType; title: string; count: number; color: string }) {
  return (
    <div className={`border-l-4 rounded-xl p-5 ${color}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-widest font-bold opacity-80">{title}</p>
          <p className="text-3xl font-bold mt-1">{count}</p>
        </div>
        <Icon size={28} className="opacity-60" />
      </div>
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

function PaginationButton({
  onClick, disabled, children,
}: { onClick: () => void; disabled: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded text-xs font-bold uppercase tracking-widest text-navy-700 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed bg-white"
    >
      {children}
    </button>
  );
}
