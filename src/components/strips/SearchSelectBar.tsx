"use client";
import { useEffect, useRef, useState } from "react";
import { Search, Plus, PlaneTakeoff, PlaneLanding, Radio } from "lucide-react";
import { stripsApi } from "@/lib/api/strips";
import type { FlightStrip, StripFlightType, SuggestItem } from "@/types";

const SOURCE_TAG: Record<string, { label: string; className: string }> = {
  dop: { label: "DOP", className: "bg-emerald-100 text-emerald-700" },
  recent: { label: "RECENT", className: "bg-sky-100 text-sky-700" },
};

const TYPES: { value: StripFlightType; label: string; icon: typeof PlaneTakeoff }[] = [
  { value: "departure", label: "DEP", icon: PlaneTakeoff },
  { value: "arrival", label: "ARR", icon: PlaneLanding },
  { value: "overflight", label: "OVR", icon: Radio },
];

interface Props {
  flightType: StripFlightType;
  onFlightType: (t: StripFlightType) => void;
  onCreated: (strip: FlightStrip) => void;
  onNewStrip: (callsign: string) => void;
}

export function SearchSelectBar({ flightType, onFlightType, onCreated, onNewStrip }: Props) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<SuggestItem[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Only scheduled (DOP) and recent flights are pickable here — registry
  // airline/aircraft entries belong in the New Strip form's pickers.
  const suggestions = items.filter((i) => i.source === "dop" || i.source === "recent");

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

  async function selectSuggestion(item: SuggestItem) {
    setBusy(true);
    try {
      const { data } = await stripsApi.create({
        flight_type: flightType,
        created_from: item.source,
        dop_entry_id: item.dop_entry_id,
        callsign: item.callsign,
        airline_id: item.airline_id,
        aircraft_type_id: item.aircraft_type_id,
        registration: item.registration,
        origin_icao: item.origin_icao,
        destination_icao: item.destination_icao,
      });
      onCreated(data);
      setQuery("");
      setItems([]);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        {/* Flight-type selector (shared with the board's default for the form) */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          {TYPES.map((t) => {
            const Icon = t.icon;
            const active = flightType === t.value;
            return (
              <button
                key={t.value}
                onClick={() => onFlightType(t.value)}
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

        {/* Search input — find a scheduled/recent flight to clone */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => suggestions.length && setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onNewStrip(query.trim());
              if (e.key === "Escape") setOpen(false);
            }}
            placeholder="Search a scheduled/recent flight to load… or click New Strip to enter one"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-navy-300"
            disabled={busy}
          />
        </div>

        {/* Primary create action — opens the New Strip form */}
        <button
          onClick={() => onNewStrip(query.trim())}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-adr text-navy-900 text-xs font-bold uppercase tracking-wider hover:brightness-95 whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5" />
          New strip
        </button>
      </div>

      {/* Suggestions dropdown (DOP + recent only) */}
      {open && suggestions.length > 0 && (
        <div className="absolute z-20 mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg max-h-72 overflow-y-auto">
          <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-50">
            Scheduled / recent flights — click to load
          </p>
          {suggestions.map((item, i) => {
            const tag = SOURCE_TAG[item.source];
            return (
              <button
                key={`${item.source}-${item.label}-${i}`}
                onClick={() => selectSuggestion(item)}
                disabled={busy}
                className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-50 last:border-0 disabled:opacity-50"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-sm font-semibold text-navy-700">{item.label}</span>
                  {item.detail && <span className="text-xs text-gray-500 truncate">{item.detail}</span>}
                </div>
                {tag && (
                  <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${tag.className}`}>
                    {tag.label}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
