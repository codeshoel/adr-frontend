"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search, Check, MapPin } from "lucide-react";
import client from "@/lib/api/client";
import { cn } from "@/lib/utils";
import type { Aerodrome } from "@/types";

interface AerodromeComboboxProps {
  value?: Aerodrome | null;
  onChange: (aerodrome: Aerodrome | null) => void;
  className?: string;
  placeholder?: string;
  accent?: string;
  allowClear?: boolean;
}

export function AerodromeCombobox({
  value, onChange, className, placeholder = "Select airport…",
  accent = "border-l-sky-500", allowClear = true,
}: AerodromeComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [aerodromes, setAerodromes] = useState<Aerodrome[]>([]);
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
        const { data } = await client.get<Aerodrome[]>("/aerodromes/", {
          params: { search: query || undefined, is_active: true },
        });
        if (!cancelled) setAerodromes(data);
      } catch {
        if (!cancelled) setAerodromes([]);
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
        className={cn(
          "w-full px-3 py-2 border-l-4 border-y border-r border-gray-200 bg-white text-sm font-mono uppercase tracking-wide text-left flex items-center justify-between rounded-r-md focus:outline-none focus:ring-2 focus:ring-navy-500",
          accent
        )}
      >
        {value ? (
          <span className="flex items-center gap-2 truncate">
            <span className="font-bold text-navy-700">{value.icao_code}</span>
            <span className="text-gray-500 text-xs normal-case truncate">{value.city}</span>
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
              placeholder="Search ICAO, city, or name…"
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-gray-400"
            />
          </div>

          <div className="overflow-y-auto flex-1">
            {allowClear && value && (
              <button
                type="button"
                onClick={() => { onChange(null); setOpen(false); setQuery(""); }}
                className="w-full px-3 py-2 text-left text-xs text-gray-500 hover:bg-gray-50 italic border-b border-gray-100"
              >
                Clear selection
              </button>
            )}
            {loading && aerodromes.length === 0 && (
              <p className="text-center text-xs text-gray-400 py-4">Loading…</p>
            )}
            {!loading && aerodromes.length === 0 && (
              <p className="text-center text-xs text-gray-400 py-4">No airports found</p>
            )}
            {aerodromes.map((a) => {
              const selected = value?.id === a.id;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => { onChange(a); setOpen(false); setQuery(""); }}
                  className={cn(
                    "w-full px-3 py-2 text-left hover:bg-navy-50 flex items-center gap-3 border-l-4",
                    selected ? "bg-navy-50 border-l-amber-adr" : "border-l-transparent"
                  )}
                >
                  <span className="font-mono font-bold text-sm text-navy-700 w-12">{a.icao_code}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-700 truncate font-medium">{a.name}</p>
                    <p className="text-[10px] text-gray-500 flex items-center gap-1">
                      <MapPin size={9} /> {a.city}, {a.state}
                    </p>
                  </div>
                  {a.iata_code && (
                    <span className="text-[9px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono font-bold">{a.iata_code}</span>
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
