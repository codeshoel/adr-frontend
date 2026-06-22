"use client";
import { useEffect, useState } from "react";
import { X, PlaneTakeoff, PlaneLanding, Radio } from "lucide-react";
import { stripsApi } from "@/lib/api/strips";
import { AirlineCombobox } from "@/components/shared/AirlineCombobox";
import { AircraftTypeCombobox } from "@/components/shared/AircraftTypeCombobox";
import { AerodromeCombobox } from "@/components/shared/AerodromeCombobox";
import { useDialog } from "@/components/ui/DialogProvider";
import type {
  Aerodrome,
  AircraftType,
  Airline,
  FlightRule,
  FlightStrip,
  StripFlightType,
} from "@/types";

// ICAO callsign: 3-letter airline designator + 1-4 digits + optional letter.
const ICAO_CALLSIGN = /^[A-Z]{3}\d{1,4}[A-Z]?$/;

const TYPES: { value: StripFlightType; label: string; icon: typeof PlaneTakeoff }[] = [
  { value: "departure", label: "Departure", icon: PlaneTakeoff },
  { value: "arrival", label: "Arrival", icon: PlaneLanding },
  { value: "overflight", label: "Overflight", icon: Radio },
];

const RULES: FlightRule[] = ["IFR", "VFR", "DVFR", "SVFR"];

interface Props {
  open: boolean;
  defaultCallsign?: string;
  defaultFlightType?: StripFlightType;
  /** Callsigns of strips already open on the board (for duplicate detection). */
  activeCallsigns?: string[];
  onClose: () => void;
  onCreated: (strip: FlightStrip) => void;
}

export function NewStripForm({ open, defaultCallsign, defaultFlightType, activeCallsigns = [], onClose, onCreated }: Props) {
  const dialog = useDialog();
  const [flightType, setFlightType] = useState<StripFlightType>(defaultFlightType ?? "departure");
  const [callsign, setCallsign] = useState("");
  const [flightNumber, setFlightNumber] = useState("");
  const [flightRule, setFlightRule] = useState<FlightRule>("IFR");
  const [airline, setAirline] = useState<Airline | null>(null);
  const [aircraft, setAircraft] = useState<AircraftType | null>(null);
  const [registration, setRegistration] = useState("");
  const [origin, setOrigin] = useState<Aerodrome | null>(null);
  const [destination, setDestination] = useState<Aerodrome | null>(null);
  const [souls, setSouls] = useState("");
  const [fuel, setFuel] = useState("");
  const [cargo, setCargo] = useState("");
  // Custom-callsign mode for unscheduled flights (military/charter/ferry).
  const [manual, setManual] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Default: callsign = airline ICAO designator + flight number (always valid).
  const composedCallsign = `${airline?.icao_code ?? ""}${flightNumber.trim()}`.toUpperCase();
  const effectiveCallsign = (manual ? callsign : composedCallsign).trim().toUpperCase();

  // Reset when (re)opened.
  useEffect(() => {
    if (open) {
      setFlightType(defaultFlightType ?? "departure");
      setCallsign((defaultCallsign ?? "").toUpperCase());
      setFlightNumber("");
      setFlightRule("IFR");
      setAirline(null);
      setAircraft(null);
      setRegistration("");
      setOrigin(null);
      setDestination(null);
      setSouls("");
      setFuel("");
      setCargo("");
      // If the operator typed a callsign in the search bar, start in custom mode.
      setManual(!!defaultCallsign);
      setError(null);
    }
  }, [open, defaultCallsign, defaultFlightType]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function submit() {
    const cs = effectiveCallsign;
    if (!cs) {
      setError(manual ? "Callsign is required." : "Select an airline and enter a flight number.");
      return;
    }

    // Duplicate already on the board?
    if (activeCallsigns.some((c) => c.toUpperCase() === cs)) {
      const ok = await dialog.confirm({
        title: "Already on the board",
        message: `A strip for ${cs} is already active. Create another?`,
        tone: "danger",
        confirmText: "Create anyway",
      });
      if (!ok) return;
    }

    // Only a custom (manual) callsign can be malformed — warn, don't block.
    if (manual && !ICAO_CALLSIGN.test(cs)) {
      const ok = await dialog.confirm({
        title: "Callsign format",
        message: `"${cs}" doesn't match the ICAO format (e.g. ABV1234). Continue anyway?`,
        tone: "danger",
        confirmText: "Create anyway",
      });
      if (!ok) return;
    }

    setBusy(true);
    setError(null);
    try {
      const { data } = await stripsApi.create({
        flight_type: flightType,
        created_from: "freeform",
        callsign: cs,
        flight_number: flightNumber.trim() || null,
        flight_rule: flightRule,
        airline_id: airline?.id ?? null,
        aircraft_type_id: aircraft?.id ?? null,
        registration: registration.trim().toUpperCase() || null,
        origin_icao: origin?.icao_code ?? null,
        destination_icao: destination?.icao_code ?? null,
        souls_on_board: souls ? Number(souls) : null,
        fuel_on_board_kg: fuel ? Number(fuel) : null,
        cargo_kg: cargo ? Number(cargo) : null,
      });
      onCreated(data);
      onClose();
    } catch (e: unknown) {
      setError(
        (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
          "Could not create strip"
      );
    } finally {
      setBusy(false);
    }
  }

  const isOverflight = flightType === "overflight";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 sticky top-0 bg-white">
          <h2 className="text-sm font-bold uppercase tracking-widest text-navy-700">New Strip</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Flight type */}
          <div className="flex gap-2">
            {TYPES.map((t) => {
              const Icon = t.icon;
              const active = flightType === t.value;
              return (
                <button
                  key={t.value}
                  onClick={() => setFlightType(t.value)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border ${
                    active ? "bg-navy-500 text-white border-navy-500" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" /> {t.label}
                </button>
              );
            })}
          </div>

          {/* Identity — callsign is built from Airline + flight number so it is
              always a valid ICAO callsign; "custom" allows unscheduled flights. */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Airline *">
              <AirlineCombobox value={airline} onChange={setAirline} />
            </Field>
            <Field label="Flight number *">
              <input
                value={flightNumber}
                onChange={(e) => setFlightNumber(e.target.value.replace(/[^0-9A-Za-z]/g, ""))}
                placeholder="231"
                className="input font-mono"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Callsign">
              {manual ? (
                <input
                  autoFocus
                  value={callsign}
                  onChange={(e) => setCallsign(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  placeholder="e.g. NMG01 (military/charter)"
                  className="input font-mono uppercase"
                />
              ) : (
                <div className="input font-mono uppercase bg-gray-50 text-navy-700 flex items-center min-h-[38px]">
                  {effectiveCallsign || <span className="text-gray-400 normal-case">Pick airline + flight no.</span>}
                </div>
              )}
              <button
                type="button"
                onClick={() => setManual((m) => !m)}
                className="mt-1 text-[11px] text-navy-500 hover:underline"
              >
                {manual ? "Use airline + flight number" : "Enter a custom callsign (unscheduled flight)"}
              </button>
            </Field>
            <Field label="Flight rule">
              <select value={flightRule} onChange={(e) => setFlightRule(e.target.value as FlightRule)} className="input">
                {RULES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </Field>
          </div>

          {/* Aircraft */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Aircraft type">
              <AircraftTypeCombobox value={aircraft} onChange={setAircraft} />
            </Field>
            <Field label="Registration">
              <input
                value={registration}
                onChange={(e) => setRegistration(e.target.value.toUpperCase())}
                placeholder="5N-ABC"
                className="input font-mono uppercase"
              />
            </Field>
          </div>

          {/* Route */}
          {!isOverflight && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Origin">
                <AerodromeCombobox value={origin} onChange={setOrigin} placeholder="Origin airport…" />
              </Field>
              <Field label="Destination">
                <AerodromeCombobox value={destination} onChange={setDestination} placeholder="Destination airport…" />
              </Field>
            </div>
          )}

          {/* Payload */}
          <div className="grid grid-cols-3 gap-3">
            <Field label="Souls on board">
              <input type="number" value={souls} onChange={(e) => setSouls(e.target.value)} className="input" />
            </Field>
            <Field label="Fuel (kg)">
              <input type="number" value={fuel} onChange={(e) => setFuel(e.target.value)} className="input" />
            </Field>
            <Field label="Cargo (kg)">
              <input type="number" value={cargo} onChange={(e) => setCargo(e.target.value)} className="input" />
            </Field>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-100 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy || !effectiveCallsign}
            className="px-5 py-2 rounded-lg bg-navy-500 text-white text-sm font-bold uppercase tracking-wider disabled:opacity-40 hover:bg-navy-600"
          >
            {busy ? "Creating…" : "Create strip"}
          </button>
        </div>
      </div>

      {/* shared input styling */}
      <style jsx>{`
        .input {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          outline: none;
        }
        .input:focus {
          box-shadow: 0 0 0 2px rgba(30, 58, 95, 0.3);
        }
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
