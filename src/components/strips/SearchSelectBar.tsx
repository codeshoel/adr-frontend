"use client";
import { useEffect, useRef, useState } from "react";
import { Search, Plus, PlaneTakeoff, PlaneLanding, Radio } from "lucide-react";
import { stripsApi } from "@/lib/api/strips";
import type { FlightStrip, StripFlightType, SuggestItem } from "@/types";

const SOURCE_TAG: Record<string, { label: string; className: string }> = {
  dop: { label: "DOP", className: "bg-emerald-100 text-emerald-700" },
  recent: { label: "RECENT", className: "bg-sky-100 text-sky-700" },
  registry: { label: "REGISTRY", className: "bg-gray-100 text-gray-600" },
  freeform: { label: "NEW", className: "bg-amber-100 text-amber-700" },
};

const TYPES: { value: StripFlightType; label: string; icon: typeof PlaneTakeoff }[] = [
  { value: "departure", label: "DEP", icon: PlaneTakeoff },
  { value: "arrival", label: "ARR", icon: PlaneLanding },
  { value: "overflight", label: "OVR", icon: Radio },
];

export function SearchSelectBar({ onCreated }: { onCreated: (strip: FlightStrip) => void }) {
  const [flightType, setFlightType] = useState<StripFlightType>("departure");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<SuggestItem[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced suggest (target ≤150ms feel; backend is the bound).
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 1) {
      setItems([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const { data } = await stripsApi.suggest(query.trim());
        setItems(data.items);
        setOpen(true);
      } catch {
        setItems([]);
      }
    }, 120);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  async function create(payload: Parameters<typeof stripsApi.create>[0]) {
    setBusy(true);
    setError(null);
    try {
      const { data } = await stripsApi.create(payload);
      onCreated(data);
      setQuery("");
      setItems([]);
      setOpen(false);
    } catch (e: unknown) {
      const detail =
        (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Could not create strip";
      setError(detail);
    } finally {
      setBusy(false);
    }
  }

  function selectSuggestion(item: SuggestItem) {
    create({
      flight_type: flightType,
      created_from: item.source,
      dop_entry_id: item.dop_entry_id,
      callsign: item.callsign ?? (item.source === "registry" ? null : item.label),
      airline_id: item.airline_id,
      aircraft_type_id: item.aircraft_type_id,
      registration: item.registration,
      origin_icao: item.origin_icao,
      destination_icao: item.destination_icao,
    });
  }

  function createFreeform() {
    create({
      flight_type: flightType,
      created_from: "freeform",
      callsign: query.trim().toUpperCase() || null,
    });
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        {/* Flight-type selector */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          {TYPES.map((t) => {
            const Icon = t.icon;
            const active = flightType === t.value;
            return (
              <button
                key={t.value}
                onClick={() => setFlightType(t.value)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
                  active ? "bg-navy-500 text-white" : "bg-white text-gray-500 hover:bg-gray-50"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => items.length && setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && items.length === 0 && query.trim()) createFreeform();
              if (e.key === "Escape") setOpen(false);
            }}
            placeholder="Search callsign, registration, plan… (or type a new callsign and press Enter)"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-navy-300"
            disabled={busy}
          />
        </div>

        <button
          onClick={createFreeform}
          disabled={busy || !query.trim()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-adr text-navy-900 text-xs font-bold uppercase tracking-wider disabled:opacity-40 hover:brightness-95"
        >
          <Plus className="w-3.5 h-3.5" />
          New strip
        </button>
      </div>

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

      {/* Suggestions dropdown */}
      {open && items.length > 0 && (
        <div className="absolute z-20 mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg max-h-72 overflow-y-auto">
          {items.map((item, i) => {
            const tag = SOURCE_TAG[item.source] ?? SOURCE_TAG.registry;
            return (
              <button
                key={`${item.source}-${item.label}-${i}`}
                onClick={() => selectSuggestion(item)}
                className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-50 last:border-0"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-sm font-semibold text-navy-700">{item.label}</span>
                  {item.detail && <span className="text-xs text-gray-500 truncate">{item.detail}</span>}
                </div>
                <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${tag.className}`}>
                  {tag.label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
