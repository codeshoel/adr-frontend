"use client";
import { useState } from "react";
import { ChevronRight, MessageSquarePlus, CornerDownRight, X, MapPin } from "lucide-react";
import type { FlightStrip } from "@/types";
import { isTerminal, nextPhase, phaseMeta, phaseProgress } from "@/lib/strips/phases";

const TYPE_ACCENT: Record<string, string> = {
  departure: "border-l-navy-500",
  arrival: "border-l-sky-500",
  overflight: "border-l-purple-500",
};

interface Props {
  strip: FlightStrip;
  busy: boolean;
  onAdvance: (strip: FlightStrip) => void;
  onWaypoint: (strip: FlightStrip) => void;
  onRemark: (strip: FlightStrip) => void;
  onDivert: (strip: FlightStrip) => void;
  onCancel: (strip: FlightStrip) => void;
}

export function StripCard({ strip, busy, onAdvance, onWaypoint, onRemark, onDivert, onCancel }: Props) {
  const [confirmCancel, setConfirmCancel] = useState(false);
  const meta = phaseMeta(strip.operational_phase);
  const next = nextPhase(strip.flight_type, strip.operational_phase);
  const terminal = isTerminal(strip.flight_type, strip.operational_phase);
  const isWaypointPhase = strip.operational_phase === "O2_WAYPOINT_PASSED";

  return (
    <div
      className={`bg-white border border-gray-100 border-l-4 ${TYPE_ACCENT[strip.flight_type]} rounded-lg shadow-sm p-3 ${
        strip.needs_supervisor ? "ring-1 ring-amber-300" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-base font-bold text-navy-700">{strip.callsign ?? "—"}</span>
          {strip.registration && (
            <span className="font-mono text-[11px] text-gray-400">{strip.registration}</span>
          )}
        </div>
        <span className="shrink-0 text-[10px] font-bold text-gray-400 tabular-nums">
          {phaseProgress(strip.flight_type, strip.operational_phase)}
        </span>
      </div>

      <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
        <span className="font-semibold text-gray-700">
          {meta?.code} · {meta?.label}
        </span>
        {(strip.origin_icao || strip.destination_icao) && (
          <span className="font-mono text-[11px] text-gray-400">
            {strip.origin_icao ?? "?"}→{strip.destination_icao ?? "?"}
          </span>
        )}
      </div>

      {strip.is_diverted && (
        <p className="mt-1 text-[11px] font-semibold text-amber-700">DIVERTED — supervisor review</p>
      )}

      <div className="mt-2.5 flex items-center gap-1.5">
        {!terminal ? (
          <button
            onClick={() => onAdvance(strip)}
            disabled={busy}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md bg-navy-500 text-white text-xs font-bold uppercase tracking-wider disabled:opacity-40 hover:bg-navy-600"
          >
            {next?.label ?? "Advance"}
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <span className="flex-1 text-center px-2 py-1.5 rounded-md bg-gray-100 text-gray-500 text-xs font-bold uppercase tracking-wider">
            Terminal
          </span>
        )}

        {isWaypointPhase && (
          <button
            onClick={() => onWaypoint(strip)}
            disabled={busy}
            title="Log another waypoint"
            className="p-1.5 rounded-md border border-gray-200 text-purple-600 hover:bg-purple-50 disabled:opacity-40"
          >
            <MapPin className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          onClick={() => onRemark(strip)}
          disabled={busy}
          title="Add remark"
          className="p-1.5 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40"
        >
          <MessageSquarePlus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onDivert(strip)}
          disabled={busy}
          title="Divert / go-around"
          className="p-1.5 rounded-md border border-gray-200 text-amber-600 hover:bg-amber-50 disabled:opacity-40"
        >
          <CornerDownRight className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => (confirmCancel ? onCancel(strip) : setConfirmCancel(true))}
          onBlur={() => setConfirmCancel(false)}
          disabled={busy}
          title="Cancel strip"
          className={`p-1.5 rounded-md border text-xs font-bold ${
            confirmCancel
              ? "border-red-400 bg-red-50 text-red-700 px-2"
              : "border-gray-200 text-gray-500 hover:bg-gray-50"
          } disabled:opacity-40`}
        >
          {confirmCancel ? "Sure?" : <X className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}
