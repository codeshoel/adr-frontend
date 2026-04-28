"use client";
import { useEffect, useMemo, useState } from "react";
import {
  Search, ChevronLeft, ChevronRight, RotateCcw, History as HistoryIcon, AlertCircle,
} from "lucide-react";
import { movementsApi } from "@/lib/api/movements";
import { MovementDetailModal } from "@/components/movements/MovementDetailModal";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatDate } from "@/lib/utils";
import { FLIGHT_TYPE_LABELS } from "@/lib/constants";
import type { FlightType, Movement, MovementFilters, MovementStatus } from "@/types";

const PAGE_SIZE = 25;

const STATUSES: { value: MovementStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Submitted" },
  { value: "flagged", label: "Flagged" },
  { value: "under_review", label: "Under Review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const FLIGHT_TYPES: { value: FlightType; label: string }[] = [
  { value: "departure", label: "Departure" },
  { value: "arrival", label: "Arrival" },
  { value: "overflight", label: "Overflight" },
  { value: "transit", label: "Transit" },
];

interface FilterState {
  callsign: string;
  date_from: string;
  date_to: string;
  status: MovementStatus | "";
  flight_type: FlightType | "";
}

const EMPTY_FILTERS: FilterState = {
  callsign: "",
  date_from: "",
  date_to: "",
  status: "",
  flight_type: "",
};

export default function OperatorHistoryPage() {
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [debouncedCallsign, setDebouncedCallsign] = useState("");
  const [page, setPage] = useState(1);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedMovementId, setSelectedMovementId] = useState<string | null>(null);

  // Debounce callsign input — wait 300ms after typing stops
  useEffect(() => {
    const t = setTimeout(() => setDebouncedCallsign(filters.callsign), 300);
    return () => clearTimeout(t);
  }, [filters.callsign]);

  // Reset to page 1 whenever a non-page filter changes
  useEffect(() => {
    setPage(1);
  }, [debouncedCallsign, filters.date_from, filters.date_to, filters.status, filters.flight_type]);

  const apiParams: MovementFilters = useMemo(() => ({
    callsign: debouncedCallsign || undefined,
    date_from: filters.date_from || undefined,
    date_to: filters.date_to || undefined,
    status: filters.status || undefined,
    flight_type: filters.flight_type || undefined,
    page,
    page_size: PAGE_SIZE,
  }), [debouncedCallsign, filters, page]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const { data } = await movementsApi.list(apiParams);
      setMovements(data.items);
      setTotal(data.total);
    } catch (err) {
      const msg = (err as { message?: string })?.message ?? "Failed to load movements";
      setError(msg);
      setMovements([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiParams]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = Object.values(filters).some((v) => v !== "");

  function set<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    setFilters((p) => ({ ...p, [key]: value }));
  }

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-8 bg-amber-adr rounded-sm" />
          <div>
            <h2 className="text-xl font-bold text-navy-700">Movement History</h2>
            <p className="text-xs text-gray-500 uppercase tracking-widest mt-0.5">
              Search and review past flight records
            </p>
          </div>
        </div>
        <p className="text-xs text-gray-500">
          {loading ? "Searching…" : `${total.toLocaleString()} movement${total !== 1 ? "s" : ""} found`}
        </p>
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

          <div className="col-span-2">
            <Label>Status</Label>
            <select
              value={filters.status}
              onChange={(e) => set("status", e.target.value as MovementStatus | "")}
              className="w-full px-3 py-2 border-l-4 border-l-purple-500 border-y border-r border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 rounded-r-md"
            >
              <option value="">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div className="col-span-2">
            <Label>Type</Label>
            <select
              value={filters.flight_type}
              onChange={(e) => set("flight_type", e.target.value as FlightType | "")}
              className="w-full px-3 py-2 border-l-4 border-l-sky-500 border-y border-r border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 rounded-r-md"
            >
              <option value="">All types</option>
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

        {hasFilters && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-1.5">
            {filters.callsign && <FilterChip label={`Callsign: ${filters.callsign}`} onClear={() => set("callsign", "")} />}
            {filters.date_from && <FilterChip label={`From ${filters.date_from}`} onClear={() => set("date_from", "")} />}
            {filters.date_to && <FilterChip label={`To ${filters.date_to}`} onClear={() => set("date_to", "")} />}
            {filters.status && <FilterChip label={`Status: ${filters.status}`} onClear={() => set("status", "")} />}
            {filters.flight_type && <FilterChip label={`Type: ${filters.flight_type}`} onClear={() => set("flight_type", "")} />}
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 px-4 py-3 rounded">
          <p className="text-sm text-red-800 flex items-center gap-2">
            <AlertCircle size={14} /> {error}
          </p>
        </div>
      )}

      {/* Results table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="text-left text-[10px] text-gray-500 uppercase tracking-widest">
              <th className="px-5 py-3">Callsign</th>
              <th>Type</th>
              <th>Date</th>
              <th>Route</th>
              <th>Aircraft</th>
              <th>Aerodrome</th>
              <th>Status</th>
              <th>Flags</th>
            </tr>
          </thead>
          <tbody>
            {loading && movements.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-8 text-center text-sm text-gray-400">Loading…</td>
              </tr>
            )}

            {!loading && movements.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-12 text-center">
                  <HistoryIcon size={28} className="text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">
                    {hasFilters ? "No movements match those filters" : "No movements found"}
                  </p>
                </td>
              </tr>
            )}

            {movements.map((m) => (
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
                <td className="font-mono text-xs text-gray-500">{m.registration ?? "—"}</td>
                <td className="font-mono text-xs">{m.aerodrome?.icao_code ?? "—"}</td>
                <td><StatusBadge status={m.status} /></td>
                <td>
                  {m.validation_flags.length > 0 ? (
                    <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">
                      {m.validation_flags.length}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-300">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-500">
              Page {page} of {totalPages} · Showing {(page - 1) * PAGE_SIZE + 1}–
              {Math.min(page * PAGE_SIZE, total)} of {total.toLocaleString()}
            </p>
            <div className="flex items-center gap-1">
              <PaginationButton
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft size={14} /> Prev
              </PaginationButton>
              <PaginationButton
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next <ChevronRight size={14} />
              </PaginationButton>
            </div>
          </div>
        )}
      </div>

      <MovementDetailModal
        movementId={selectedMovementId}
        onClose={() => setSelectedMovementId(null)}
        onChanged={load}
      />
    </div>
  );
}

// ===== sub-components =====

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
      {children}
    </label>
  );
}

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <button
      onClick={onClear}
      className="inline-flex items-center gap-1.5 px-2 py-1 bg-navy-50 text-navy-700 text-[10px] font-bold uppercase tracking-widest rounded hover:bg-navy-100"
    >
      {label}
      <span className="text-navy-400 font-bold">×</span>
    </button>
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
