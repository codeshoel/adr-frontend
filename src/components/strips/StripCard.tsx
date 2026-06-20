"use client";
import { ChevronRight, Settings2, MessageSquarePlus, CornerDownRight, X, MapPin } from "lucide-react";
import type { FlightStrip } from "@/types";
import { isTerminal, nextPhase } from "@/lib/strips/phases";

const TYPE_BADGE: Record<string, string> = {
  departure: "bg-navy-100 text-navy-700",
  arrival: "bg-sky-100 text-sky-700",
  overflight: "bg-purple-100 text-purple-700",
};

const TYPE_ACCENT: Record<string, string> = {
  departure: "border-l-amber-adr",
  arrival: "border-l-sky-500",
  overflight: "border-l-purple-500",
};

interface Props {
  strip: FlightStrip;
  busy: boolean;
  onAdvance: (strip: FlightStrip) => void;
  onWaypoint: (strip: FlightStrip) => void;
  onEdit: (strip: FlightStrip) => void;
  onRemark: (strip: FlightStrip) => void;
  onDivert: (strip: FlightStrip) => void;
  onCancel: (strip: FlightStrip) => void;
  onDragStart: (strip: FlightStrip) => void;
  onDragEnd: () => void;
}

export function StripCard({
  strip, busy, onAdvance, onWaypoint, onEdit, onRemark, onDivert, onCancel, onDragStart, onDragEnd,
}: Props) {
  const next = nextPhase(strip.flight_type, strip.operational_phase);
  const terminal = isTerminal(strip.flight_type, strip.operational_phase);
  const isWaypointPhase = strip.operational_phase === "O2_WAYPOINT_PASSED";

  return (
    <div
      draggable={!busy}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", strip.id);
        onDragStart(strip);
      }}
      onDragEnd={onDragEnd}
      className={`bg-white border border-gray-100 border-l-4 ${TYPE_ACCENT[strip.flight_type]} rounded-lg shadow-sm p-3 cursor-grab active:cursor-grabbing ${
        strip.needs_supervisor ? "ring-1 ring-amber-400" : ""
      } ${busy ? "opacity-60" : ""}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-base font-bold text-navy-700">{strip.callsign ?? "—"}</span>
        <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${TYPE_BADGE[strip.flight_type]}`}>
          {strip.flight_type}
        </span>
      </div>

      {/* Route + aircraft */}
      <div className="mt-1.5 space-y-0.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-mono text-gray-500">
            {strip.origin_icao ?? "????"} <span className="text-gray-300">→</span> {strip.destination_icao ?? "????"}
          </span>
          {strip.registration && <span className="font-mono text-[11px] text-gray-400">{strip.registration}</span>}
        </div>
        {strip.aircraft_type?.icao_designator && (
          <div className="text-[11px] text-gray-400 font-mono">✈ {strip.aircraft_type.icao_designator}</div>
        )}
      </div>

      {strip.is_diverted && (
        <p className="mt-1 text-[11px] font-semibold text-amber-700">DIVERTED — supervisor review</p>
      )}

      {/* Next phase banner */}
      {!terminal && next && (
        <div className="mt-2 flex items-center justify-between bg-gray-50 rounded-md px-2.5 py-1.5">
          <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Next phase</span>
          <span className="text-xs font-bold text-navy-700">{next.label}</span>
        </div>
      )}

      {/* Actions */}
      <div className="mt-2.5 flex items-center gap-1.5">
        <button
          onClick={() => onEdit(strip)}
          disabled={busy}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 disabled:opacity-40"
        >
          <Settings2 className="w-3.5 h-3.5" /> Edit
        </button>

        {!terminal ? (
          <button
            onClick={() => onAdvance(strip)}
            disabled={busy}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md bg-navy-500 text-white text-xs font-bold uppercase tracking-wider hover:bg-navy-600 disabled:opacity-40"
          >
            Next <ChevronRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <span className="flex-1 text-center px-2 py-1.5 rounded-md bg-gray-100 text-gray-500 text-xs font-bold uppercase">Terminal</span>
        )}

        {isWaypointPhase && (
          <button onClick={() => onWaypoint(strip)} disabled={busy} title="Log waypoint"
            className="p-1.5 rounded-md border border-gray-200 text-purple-600 hover:bg-purple-50 disabled:opacity-40">
            <MapPin className="w-3.5 h-3.5" />
          </button>
        )}
        <button onClick={() => onRemark(strip)} disabled={busy} title="Add remark"
          className="p-1.5 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40">
          <MessageSquarePlus className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => onDivert(strip)} disabled={busy} title="Divert / go-around"
          className="p-1.5 rounded-md border border-gray-200 text-amber-600 hover:bg-amber-50 disabled:opacity-40">
          <CornerDownRight className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => onCancel(strip)} disabled={busy} title="Cancel strip"
          className="p-1.5 rounded-md border border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-40">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
