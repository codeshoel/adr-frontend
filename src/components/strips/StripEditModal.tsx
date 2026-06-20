"use client";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { stripsApi } from "@/lib/api/strips";
import type { FlightRule, FlightStrip } from "@/types";

const RULES: FlightRule[] = ["IFR", "VFR", "DVFR", "SVFR"];

interface Props {
  strip: FlightStrip | null;
  onClose: () => void;
  onSaved: () => void;
}

export function StripEditModal({ strip, onClose, onSaved }: Props) {
  const [callsign, setCallsign] = useState("");
  const [flightNumber, setFlightNumber] = useState("");
  const [flightRule, setFlightRule] = useState<FlightRule>("IFR");
  const [registration, setRegistration] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [souls, setSouls] = useState("");
  const [fuel, setFuel] = useState("");
  const [cargo, setCargo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (strip) {
      setCallsign(strip.callsign ?? "");
      setFlightNumber(strip.flight_number ?? "");
      setFlightRule(strip.flight_rule);
      setRegistration(strip.registration ?? "");
      setOrigin(strip.origin_icao ?? "");
      setDestination(strip.destination_icao ?? "");
      setSouls(strip.souls_on_board != null ? String(strip.souls_on_board) : "");
      setFuel(strip.fuel_on_board_kg != null ? String(strip.fuel_on_board_kg) : "");
      setCargo(strip.cargo_kg != null ? String(strip.cargo_kg) : "");
      setError(null);
    }
  }, [strip]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (strip) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [strip, onClose]);

  if (!strip) return null;

  async function save() {
    if (!strip) return;
    setBusy(true);
    setError(null);
    try {
      await stripsApi.edit(strip.id, {
        callsign: callsign.trim().toUpperCase() || null,
        flight_number: flightNumber.trim() || null,
        flight_rule: flightRule,
        registration: registration.trim().toUpperCase() || null,
        origin_icao: origin.trim().toUpperCase() || null,
        destination_icao: destination.trim().toUpperCase() || null,
        souls_on_board: souls ? Number(souls) : null,
        fuel_on_board_kg: fuel ? Number(fuel) : null,
        cargo_kg: cargo ? Number(cargo) : null,
      });
      onSaved();
      onClose();
    } catch (e: unknown) {
      setError(
        (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Could not save"
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h2 className="text-sm font-bold uppercase tracking-widest text-navy-700">
            Edit strip · <span className="font-mono">{strip.callsign}</span>
          </h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-500"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 grid grid-cols-2 gap-3">
          <Field label="Callsign"><input value={callsign} onChange={(e) => setCallsign(e.target.value.toUpperCase())} className="in font-mono uppercase" /></Field>
          <Field label="Flight number"><input value={flightNumber} onChange={(e) => setFlightNumber(e.target.value)} className="in font-mono" /></Field>
          <Field label="Flight rule">
            <select value={flightRule} onChange={(e) => setFlightRule(e.target.value as FlightRule)} className="in">
              {RULES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
          <Field label="Registration"><input value={registration} onChange={(e) => setRegistration(e.target.value.toUpperCase())} className="in font-mono uppercase" /></Field>
          <Field label="Origin (ICAO)"><input value={origin} onChange={(e) => setOrigin(e.target.value.toUpperCase())} maxLength={4} className="in font-mono uppercase" /></Field>
          <Field label="Destination (ICAO)"><input value={destination} onChange={(e) => setDestination(e.target.value.toUpperCase())} maxLength={4} className="in font-mono uppercase" /></Field>
          <Field label="Souls"><input type="number" value={souls} onChange={(e) => setSouls(e.target.value)} className="in" /></Field>
          <Field label="Fuel (kg)"><input type="number" value={fuel} onChange={(e) => setFuel(e.target.value)} className="in" /></Field>
          <Field label="Cargo (kg)"><input type="number" value={cargo} onChange={(e) => setCargo(e.target.value)} className="in" /></Field>
        </div>

        {error && <p className="px-5 text-sm text-red-600">{error}</p>}

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100">Cancel</button>
          <button onClick={save} disabled={busy} className="px-5 py-2 rounded-lg bg-navy-500 text-white text-sm font-bold uppercase tracking-wider hover:bg-navy-600 disabled:opacity-40">
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      <style jsx>{`
        .in { width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #e5e7eb; border-radius: 0.5rem; font-size: 0.875rem; outline: none; }
        .in:focus { box-shadow: 0 0 0 2px rgba(30,58,95,0.3); }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1">{label}</span>
      {children}
    </label>
  );
}
