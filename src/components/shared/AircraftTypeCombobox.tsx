"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search, Check } from "lucide-react";
import client from "@/lib/api/client";
import { cn } from "@/lib/utils";
import type { AircraftType } from "@/types";

interface AircraftTypeComboboxProps {
  value?: AircraftType | null;
  onChange: (aircraft: AircraftType | null) => void;
  className?: string;
  placeholder?: string;
}

const WTC_LABELS: Record<string, { label: string; className: string }> = {
  L: { label: "Light", className: "bg-emerald-100 text-emerald-700" },
  M: { label: "Medium", className: "bg-sky-100 text-sky-700" },
  H: { label: "Heavy", className: "bg-amber-100 text-amber-700" },
  J: { label: "Super", className: "bg-purple-100 text-purple-700" },
};

export function AircraftTypeCombobox({
  value, onChange, className, placeholder = "Select aircraft…",
}: AircraftTypeComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [types, setTypes] = useState<AircraftType[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => searchInputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await client.get<AircraftType[]>("/aircraft/", {
          params: { search: query || undefined },
        });
        if (!cancelled) setTypes(data);
      } catch {
        if (!cancelled) setTypes([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 200);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full px-3 py-2 border-l-4 border-l-amber-500 border-y border-r border-gray-200 bg-white text-sm font-mono uppercase tracking-wide text-left flex items-center justify-between rounded-r-md focus:outline-none focus:ring-2 focus:ring-navy-500"
      >
        {value ? (
          <span className="flex items-center gap-2 truncate">
            <span className="font-bold text-navy-700">{value.icao_designator}</span>
            <span className="text-gray-500 text-xs normal-case truncate">{value.manufacturer} {value.model}</span>
          </span>
        ) : (
          <span className="text-gray-400 normal-case font-normal">{placeholder}</span>
        )}
        <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border-2 border-navy-500 rounded-md shadow-2xl max-h-72 flex flex-col">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 bg-navy-50">
            <Search size={14} className="text-navy-500" />
            <input
              ref={searchInputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search ICAO, manufacturer, model…"
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-gray-400"
            />
          </div>

          <div className="overflow-y-auto flex-1">
            {value && (
              <button
                type="button"
                onClick={() => { onChange(null); setOpen(false); setQuery(""); }}
                className="w-full px-3 py-2 text-left text-xs text-gray-500 hover:bg-gray-50 italic border-b border-gray-100"
              >
                Clear selection
              </button>
            )}
            {loading && types.length === 0 && (
              <p className="text-center text-xs text-gray-400 py-4">Loading…</p>
            )}
            {!loading && types.length === 0 && (
              <p className="text-center text-xs text-gray-400 py-4">No aircraft types found</p>
            )}
            {types.map((t) => {
              const selected = value?.id === t.id;
              const wtc = WTC_LABELS[t.wake_turbulence_category];
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => { onChange(t); setOpen(false); setQuery(""); }}
                  className={cn(
                    "w-full px-3 py-2 text-left hover:bg-navy-50 flex items-center gap-3 border-l-4",
                    selected ? "bg-navy-50 border-l-amber-adr" : "border-l-transparent"
                  )}
                >
                  <span className="font-mono font-bold text-sm text-navy-700 w-14">{t.icao_designator}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-700 truncate font-medium">
                      {t.manufacturer} {t.model}
                    </p>
                    <p className="text-[10px] text-gray-500">
                      {t.engine_type} · {t.max_pax ? `${t.max_pax} pax` : "—"}
                    </p>
                  </div>
                  {wtc && (
                    <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-bold tracking-wider", wtc.className)}>
                      {wtc.label}
                    </span>
                  )}
                  {selected && <Check size={14} className="text-amber-adr" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
