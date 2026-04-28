"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search, Check } from "lucide-react";
import client from "@/lib/api/client";
import { cn } from "@/lib/utils";
import type { Airline } from "@/types";

interface AirlineComboboxProps {
  value?: Airline | null;
  onChange: (airline: Airline | null) => void;
  className?: string;
  placeholder?: string;
  error?: string;
}

export function AirlineCombobox({ value, onChange, className, placeholder = "Select airline…", error }: AirlineComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [airlines, setAirlines] = useState<Airline[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Focus search when opened
  useEffect(() => {
    if (open) setTimeout(() => searchInputRef.current?.focus(), 50);
  }, [open]);

  // Debounced load
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await client.get<Airline[]>("/airlines/", {
          params: { search: query || undefined, is_active: true },
        });
        if (!cancelled) setAirlines(data);
      } catch {
        if (!cancelled) setAirlines([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 200);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      {/* Trigger button styled like the other form inputs */}
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={cn(
          "w-full px-3 py-2 border-l-4 border-y border-r border-gray-200 bg-white text-sm font-mono uppercase tracking-wide text-left flex items-center justify-between rounded-r-md",
          "border-l-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500",
          error && "border-red-400"
        )}
      >
        {value ? (
          <span className="flex items-center gap-2 truncate">
            <span className="font-bold text-navy-700">{value.icao_code}</span>
            <span className="text-gray-500 text-xs normal-case truncate">{value.name}</span>
          </span>
        ) : (
          <span className="text-gray-400 normal-case font-normal">{placeholder}</span>
        )}
        <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border-2 border-navy-500 rounded-md shadow-2xl max-h-72 flex flex-col">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 bg-navy-50">
            <Search size={14} className="text-navy-500" />
            <input
              ref={searchInputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search ICAO, name, or country…"
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-gray-400"
            />
          </div>

          <div className="overflow-y-auto flex-1">
            {loading && airlines.length === 0 && (
              <p className="text-center text-xs text-gray-400 py-4">Loading…</p>
            )}
            {!loading && airlines.length === 0 && (
              <p className="text-center text-xs text-gray-400 py-4">No airlines found</p>
            )}
            {airlines.map((a) => {
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
                  <span className="flex-1 text-xs text-gray-700 truncate">{a.name}</span>
                  {a.is_domestic && (
                    <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold tracking-wider">DOM</span>
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
