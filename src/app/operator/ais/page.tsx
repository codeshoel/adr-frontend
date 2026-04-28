"use client";
import { useEffect, useState } from "react";
import { Plane, RefreshCw, CheckCircle, Radar, Clock, AlertCircle } from "lucide-react";
import { aisApi, type AISFlight } from "@/lib/api/ais";
import { MovementDetailModal } from "@/components/movements/MovementDetailModal";
import { formatTime, getApiErrorMessage } from "@/lib/utils";

export default function OperatorAisPage() {
  const [flights, setFlights] = useState<AISFlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"today" | "all">("today");
  const [selectedMovementId, setSelectedMovementId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const params = filter === "today"
        ? { movement_date: new Date().toISOString().split("T")[0] }
        : undefined;
      const { data } = await aisApi.list(params);
      setFlights(data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load AIS flights"));
      setFlights([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function handleQuickConfirm(flightId: string) {
    setConfirming(flightId);
    try {
      await aisApi.confirm(flightId);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to confirm"));
    } finally {
      setConfirming(null);
    }
  }

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-8 bg-amber-adr rounded-sm" />
          <div>
            <h2 className="text-xl font-bold text-navy-700">AIS Pre-Population Queue</h2>
            <p className="text-xs text-gray-500 uppercase tracking-widest mt-0.5">
              Inbound flight plans awaiting ATC confirmation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-white border border-gray-200 rounded-lg p-1 flex gap-1">
            {(["today", "all"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs font-bold uppercase tracking-widest rounded transition-colors ${
                  filter === f ? "bg-navy-500 text-white" : "text-gray-500 hover:bg-gray-50"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold uppercase tracking-widest text-navy-500 hover:bg-navy-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Status strip */}
      <div className="grid grid-cols-3 gap-3">
        <StatusStrip
          icon={Plane}
          label="Pending"
          count={flights.length}
          color="text-cyan-600 bg-cyan-50 border-cyan-200"
        />
        <StatusStrip
          icon={Clock}
          label="Departures"
          count={flights.filter((f) => f.ais_eobt).length}
          color="text-emerald-600 bg-emerald-50 border-emerald-200"
        />
        <StatusStrip
          icon={Radar}
          label="With Aircraft Type"
          count={flights.filter((f) => f.ais_aircraft_type_code).length}
          color="text-amber-700 bg-amber-50 border-amber-200"
        />
      </div>

      {/* Errors */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 px-4 py-3 rounded">
          <p className="text-sm text-red-800 flex items-center gap-2">
            <AlertCircle size={14} /> {error}
          </p>
        </div>
      )}

      {/* Flight cards grid */}
      {loading && flights.length === 0 && (
        <div className="text-center py-12">
          <Radar size={32} className="text-gray-300 mx-auto mb-2 animate-pulse" />
          <p className="text-sm text-gray-400">Loading AIS feed…</p>
        </div>
      )}

      {!loading && flights.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <CheckCircle size={32} className="text-emerald-500 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-gray-700">All AIS flights confirmed</h3>
          <p className="text-xs text-gray-400 mt-1">
            New flight plans pushed by AIS will appear here automatically
          </p>
        </div>
      )}

      {flights.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {flights.map((flight) => (
            <AisFlightCard
              key={flight.id}
              flight={flight}
              onConfirm={() => handleQuickConfirm(flight.id)}
              onReview={() => setSelectedMovementId(flight.id)}
              confirming={confirming === flight.id}
            />
          ))}
        </div>
      )}

      <MovementDetailModal
        movementId={selectedMovementId}
        onClose={() => setSelectedMovementId(null)}
        onChanged={load}
      />
    </div>
  );
}

// ===== sub-components =====

function StatusStrip({
  icon: Icon, label, count, color,
}: { icon: React.ElementType; label: string; count: number; color: string }) {
  return (
    <div className={`border-l-4 rounded-xl px-4 py-3 ${color}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-widest font-bold opacity-80">{label}</p>
          <p className="text-2xl font-bold mt-0.5">{count}</p>
        </div>
        <Icon size={22} className="opacity-60" />
      </div>
    </div>
  );
}

function AisFlightCard({
  flight, onConfirm, onReview, confirming,
}: { flight: AISFlight; onConfirm: () => void; onReview: () => void; confirming: boolean }) {
  const route = flight.origin_icao && flight.destination_icao
    ? `${flight.origin_icao} → ${flight.destination_icao}`
    : "Route not specified";

  return (
    <div className="bg-white border-2 border-cyan-200 rounded-xl shadow-sm hover:border-cyan-400 hover:shadow-md transition-all">
      {/* Cyan AIS strip */}
      <div className="bg-gradient-to-r from-cyan-50 via-white to-cyan-50 px-4 py-2 border-b border-cyan-100 flex items-center justify-between">
        <span className="text-[9px] font-bold tracking-widest uppercase text-cyan-700">
          AIS Pre-Populated
        </span>
        <span className="text-[10px] font-mono text-gray-500">
          {new Date(flight.movement_date).toLocaleDateString("en-NG", { month: "short", day: "numeric" })}
        </span>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-3">
        <div className="flex items-baseline justify-between">
          <p className="font-mono text-2xl font-bold tracking-wider text-navy-700">{flight.callsign}</p>
          {flight.ais_aircraft_type_code && (
            <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold tracking-widest">
              {flight.ais_aircraft_type_code}
            </span>
          )}
        </div>

        {/* Route */}
        <div className="flex items-center justify-center bg-sky-50 rounded-md py-2">
          <p className="font-mono text-sm font-bold text-navy-700">{route}</p>
        </div>

        {/* Times */}
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="bg-gray-50 rounded p-2">
            <p className="text-[9px] uppercase tracking-widest text-gray-500 font-bold">EOBT</p>
            <p className="font-mono text-sm font-bold text-emerald-600 mt-0.5">
              {flight.ais_eobt ? formatTime(flight.ais_eobt) : "— —"}
            </p>
          </div>
          <div className="bg-gray-50 rounded p-2">
            <p className="text-[9px] uppercase tracking-widest text-gray-500 font-bold">Status</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-600 mt-0.5 pt-1">
              {flight.status}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={onReview}
            className="flex-1 px-3 py-2 border border-navy-500 text-navy-500 hover:bg-navy-50 font-bold uppercase text-[10px] tracking-widest rounded transition-colors"
          >
            Review &amp; Edit
          </button>
          <button
            onClick={onConfirm}
            disabled={confirming}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-400 text-white font-bold uppercase text-[10px] tracking-widest rounded transition-colors"
          >
            <CheckCircle size={11} />
            {confirming ? "Confirming…" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
