"use client";
import { useEffect, useRef, useState } from "react";
import { Search, Plane } from "lucide-react";
import { stripsApi } from "@/lib/api/strips";
import { cn } from "@/lib/utils";
import type { SuggestItem } from "@/types";

interface Props {
  value: string;
  onChange: (callsign: string) => void;
  /** Called when a known flight is picked, so the form can prefill other fields. */
  onPick?: (item: SuggestItem) => void;
  autoFocus?: boolean;
  onEnter?: () => void;
}

export function CallsignCombobox({ value, onChange, onPick, autoFocus, onEnter }: Props) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<SuggestItem[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Only real flights (scheduled / recent) are pickable callsigns.
  const suggestions = items.filter((i) => i.source === "dop" || i.source === "recent");

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = value.trim();
    if (q.length < 1) {
      setItems([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await stripsApi.suggest(q);
        setItems(data.items);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }, 150);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  function pick(item: SuggestItem) {
    if (item.callsign) onChange(item.callsign);
    onPick?.(item);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => {
            onChange(e.target.value.toUpperCase());
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setOpen(false);
              onEnter?.();
            }
            if (e.key === "Escape") setOpen(false);
          }}
          placeholder="Type or select a callsign…"
          className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-navy-300"
        />
      </div>

      {open && value.trim().length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-xl max-h-64 overflow-y-auto">
          {suggestions.map((item, i) => (
            <button
              key={`${item.source}-${item.label}-${i}`}
              type="button"
              onClick={() => pick(item)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-navy-50 border-b border-gray-50 last:border-0"
            >
              <span className="flex items-center gap-2 min-w-0">
                <Plane className="w-3.5 h-3.5 text-navy-400 shrink-0" />
                <span className="font-mono text-sm font-semibold text-navy-700">{item.callsign}</span>
                {item.detail && <span className="text-xs text-gray-500 truncate">{item.detail}</span>}
              </span>
              <span
                className={cn(
                  "shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded",
                  item.source === "dop" ? "bg-emerald-100 text-emerald-700" : "bg-sky-100 text-sky-700"
                )}
              >
                {item.source === "dop" ? "DOP" : "RECENT"}
              </span>
            </button>
          ))}

          {/* Always allow using the typed value as a new callsign */}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-amber-50 border-t border-gray-100"
          >
            <span className="text-xs text-gray-500">Use new callsign</span>
            <span className="font-mono text-sm font-bold text-navy-700">{value.trim().toUpperCase()}</span>
            {loading && <span className="ml-auto text-[10px] text-gray-400">searching…</span>}
          </button>
        </div>
      )}
    </div>
  );
}
