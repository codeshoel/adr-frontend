"use client";
import { useEffect } from "react";
import { X, CheckCircle2, Circle, MessageSquare } from "lucide-react";
import type { FlightStrip } from "@/types";
import { sequenceFor, phaseMeta, phaseIndex } from "@/lib/strips/phases";

interface Props {
  strip: FlightStrip | null;
  onClose: () => void;
}

function fmt(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, { hour12: false });
  } catch {
    return iso;
  }
}

export function StripDetailsModal({ strip, onClose }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (strip) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [strip, onClose]);

  if (!strip) return null;

  const seq = sequenceFor(strip.flight_type);
  const currentIdx = phaseIndex(strip.flight_type, strip.operational_phase);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onMouseDown={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 sticky top-0 bg-white">
          <div className="flex items-center gap-2">
            <span className="font-mono text-lg font-bold text-navy-700">{strip.callsign ?? "—"}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
              {strip.flight_type}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-navy-100 text-navy-700">
              {strip.status}
            </span>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-500"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-5">
          {/* Identity / route */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <Detail label="Route" value={`${strip.origin_icao ?? "????"} → ${strip.destination_icao ?? "????"}`} mono />
            <Detail label="Aircraft" value={strip.aircraft_type?.icao_designator ?? "—"} mono />
            <Detail label="Registration" value={strip.registration ?? "—"} mono />
            <Detail label="Flight rule" value={strip.flight_rule} />
            <Detail label="Souls" value={strip.souls_on_board ?? "—"} />
            <Detail label="Fuel (kg)" value={strip.fuel_on_board_kg ?? "—"} />
            <Detail label="Cargo (kg)" value={strip.cargo_kg ?? "—"} />
            <Detail label="Source" value={strip.created_from} />
          </div>

          {strip.is_diverted && strip.divert_reason && (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              <b>Diverted:</b> {strip.divert_reason}
            </p>
          )}
          {strip.cancel_reason && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              <b>Cancelled:</b> {strip.cancel_reason}
            </p>
          )}

          {/* Phase timeline (status changes) */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Phase progress</h3>
            <ol className="space-y-1.5">
              {seq.map((p, i) => {
                const ts = strip.phase_timestamps?.[p.value];
                const done = i <= currentIdx;
                return (
                  <li key={p.value} className="flex items-center gap-2 text-sm">
                    {done ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <Circle className="w-4 h-4 text-gray-300 shrink-0" />}
                    <span className={`w-8 font-mono text-xs ${done ? "text-navy-700 font-semibold" : "text-gray-400"}`}>{p.code}</span>
                    <span className={done ? "text-gray-700" : "text-gray-400"}>{p.label}</span>
                    <span className="ml-auto text-xs text-gray-400 tabular-nums">{fmt(ts)}</span>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Remarks */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Remarks</h3>
            {strip.remarks?.length ? (
              <ul className="space-y-1.5">
                {strip.remarks.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm bg-gray-50 rounded-md px-3 py-2">
                    <MessageSquare className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-gray-700">{r.text}</p>
                      <p className="text-[11px] text-gray-400">
                        {phaseMeta(r.phase as never)?.label ?? r.phase} · {fmt(r.at)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400">No remarks.</p>
            )}
          </div>

          {/* Overrides (field edits) */}
          {strip.overrides?.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Edits</h3>
              <ul className="space-y-1 text-sm">
                {strip.overrides.map((o, i) => (
                  <li key={i} className="text-gray-600">
                    <span className="font-mono text-xs">{String(o.field)}</span>: {String(o.original ?? "—")} → <b>{String(o.new ?? "—")}</b>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-gray-400">{label}</p>
      <p className={`text-gray-800 ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}
