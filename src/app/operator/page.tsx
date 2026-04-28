"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { PlaneTakeoff, PlaneLanding, Radio, Activity, Radar, Clock, AlertCircle } from "lucide-react";
import { movementsApi } from "@/lib/api/movements";
import { useAuthStore } from "@/store/auth.store";
import { useShiftStore } from "@/store/shift.store";
import { ValidationPanel } from "@/components/movements/ValidationPanel";
import { MovementDetailModal } from "@/components/movements/MovementDetailModal";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { AirlineCombobox } from "@/components/shared/AirlineCombobox";
import { AerodromeCombobox } from "@/components/shared/AerodromeCombobox";
import { AircraftTypeCombobox } from "@/components/shared/AircraftTypeCombobox";
import { FLIGHT_TYPE_LABELS } from "@/lib/constants";
import { formatDuration, getApiErrorMessage } from "@/lib/utils";
import type { Aerodrome, AircraftType, Airline, Movement, ValidationFlag } from "@/types";

const movementSchema = z.object({
  flight_number: z
    .string()
    .min(1, "Required")
    .regex(/^[0-9]{1,4}[A-Z]?$/, "1–4 digits, optional suffix letter (e.g. 1234 or 1234A)"),
  flight_type: z.enum(["arrival", "departure", "overflight", "transit"]),
  flight_rule: z.enum(["IFR", "VFR", "DVFR", "SVFR"]),
  movement_date: z.string().min(1),
  registration: z.string().max(10).optional().or(z.literal("")),
  atd: z.string().optional().or(z.literal("")),
  ata: z.string().optional().or(z.literal("")),
  aobt: z.string().optional().or(z.literal("")),
  aibt: z.string().optional().or(z.literal("")),
  atot: z.string().optional().or(z.literal("")),
  aldt: z.string().optional().or(z.literal("")),
  souls_on_board: z.coerce.number().min(0).max(1000).optional(),
  fuel_on_board_kg: z.coerce.number().min(0).optional(),
  atc_remarks: z.string().max(1000).optional().or(z.literal("")),
});

type MovementFormData = z.infer<typeof movementSchema>;

// Aviation accent colors per field category — left-border colors
const ACCENT = {
  identity: "border-l-navy-500",   // navy = identification (primary)
  route: "border-l-sky-500",       // sky-blue = navigation/route
  aircraft: "border-l-amber-500",  // amber = aircraft equipment
  time: "border-l-emerald-500",    // green = timing / clearances
  payload: "border-l-purple-500",  // purple = payload data
  remarks: "border-l-gray-400",
};

export default function OperatorPage() {
  const { user } = useAuthStore();
  const [todayMovements, setTodayMovements] = useState<Movement[]>([]);
  const [validationFlags, setValidationFlags] = useState<ValidationFlag[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [now, setNow] = useState(new Date());
  const [airline, setAirline] = useState<Airline | null>(null);
  const [airlineError, setAirlineError] = useState("");
  const [origin, setOrigin] = useState<Aerodrome | null>(null);
  const [destination, setDestination] = useState<Aerodrome | null>(null);
  const [aircraft, setAircraft] = useState<AircraftType | null>(null);
  const [selectedMovementId, setSelectedMovementId] = useState<string | null>(null);
  const activeShift = useShiftStore((s) => s.activeShift);

  const today = new Date().toISOString().split("T")[0];

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<MovementFormData>({
    resolver: zodResolver(movementSchema),
    defaultValues: { flight_type: "departure", flight_rule: "IFR", movement_date: today },
  });

  const flightType = watch("flight_type");
  const flightNumber = watch("flight_number");
  const previewCallsign = airline && flightNumber ? `${airline.icao_code}${flightNumber.toUpperCase()}` : "";

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    loadTodayMovements();
  }, []);

  async function loadTodayMovements() {
    try {
      const { data } = await movementsApi.list({ date_from: today, date_to: today, page: 1, page_size: 100 });
      setTodayMovements(data.items);
    } catch { /* ignore */ }
  }

  async function onSubmit(formData: MovementFormData) {
    setSuccessMsg("");
    setValidationFlags([]);
    setAirlineError("");

    if (!airline) {
      setAirlineError("Select an airline");
      return;
    }

    const callsign = `${airline.icao_code}${formData.flight_number.toUpperCase()}`;
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        callsign,
        airline_id: airline.id,
        aircraft_type_id: aircraft?.id,
        origin_icao: origin?.icao_code,
        destination_icao: destination?.icao_code,
        shift_id: activeShift?.id,
      };
      const { data: movement } = await movementsApi.create(payload as never);
      setValidationFlags(movement.validation_flags ?? []);
      setSuccessMsg(`✓ ${movement.callsign} recorded — status: ${movement.status.toUpperCase()}`);
      reset({ flight_type: "departure", flight_rule: "IFR", movement_date: today });
      setAirline(null);
      setOrigin(null);
      setDestination(null);
      setAircraft(null);
      await loadTodayMovements();
    } catch (err: unknown) {
      setValidationFlags([{
        id: "form_error", flag_code: "SUBMIT_ERROR",
        flag_message: getApiErrorMessage(err, "Submission failed"),
        severity: "error", field_name: null, is_resolved: false,
      }]);
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = "w-full px-3 py-2 border-l-4 border-y border-r border-gray-200 bg-white text-sm font-mono uppercase tracking-wide focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-navy-500 rounded-r-md";
  const labelClass = "block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1";

  const utcTime = now.toISOString().substr(11, 8);
  const localTime = now.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Africa/Lagos", hour12: false });

  return (
    <div className="flex h-full bg-gray-100">
      {/* LEFT: Today's queue */}
      <aside className="w-64 border-r-2 border-navy-500 bg-white flex flex-col overflow-hidden">
        <div className="bg-navy-500 px-4 py-3 text-white">
          <div className="flex items-center gap-2">
            <Radar size={14} className="text-amber-adr" />
            <h2 className="text-xs font-bold uppercase tracking-wider">Today's Movements</h2>
          </div>
          <p className="text-[10px] text-navy-100 mt-0.5">{todayMovements.length} logged · {today}</p>

          {/* Compact stats grid */}
          <div className="grid grid-cols-4 gap-1 mt-3 pt-3 border-t border-navy-400">
            <StatPill label="DEP" value={todayMovements.filter((m) => m.flight_type === "departure").length} accent="text-emerald-300" />
            <StatPill label="ARR" value={todayMovements.filter((m) => m.flight_type === "arrival").length} accent="text-sky-300" />
            <StatPill label="OK" value={todayMovements.filter((m) => m.status === "approved").length} accent="text-amber-adr" />
            <StatPill label="⚠" value={todayMovements.filter((m) => m.status === "draft" || m.status === "flagged").length} accent="text-red-300" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {todayMovements.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelectedMovementId(m.id)}
              className={`w-full text-left px-3 py-2.5 hover:bg-navy-50 transition-colors border-l-4 ${
                m.flight_type === "departure" ? "border-l-emerald-500" :
                m.flight_type === "arrival" ? "border-l-sky-500" :
                "border-l-gray-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-bold text-navy-700">{m.callsign}</span>
                <StatusBadge status={m.status} />
              </div>
              <div className="flex items-center gap-2 mt-1 text-[10px]">
                <span className="bg-navy-500 text-white px-1.5 py-0.5 rounded font-bold tracking-wider">
                  {FLIGHT_TYPE_LABELS[m.flight_type]}
                </span>
                {m.origin_icao && m.destination_icao && (
                  <span className="font-mono text-gray-500">{m.origin_icao} → {m.destination_icao}</span>
                )}
              </div>
            </button>
          ))}
          {todayMovements.length === 0 && (
            <p className="text-center text-xs text-gray-400 py-8 italic">No movements logged today</p>
          )}
        </div>
      </aside>

      {/* CENTER: Main form */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* HUD-style status bar */}
        <div className="bg-navy-500 text-white px-6 py-3 grid grid-cols-5 gap-4 border-b-4 border-amber-adr">
          <div>
            <p className="text-[10px] text-navy-200 uppercase tracking-widest">Station</p>
            <p className="text-base font-mono font-bold">
              {activeShift?.aerodrome?.icao_code ?? "—"} <span className="text-xs text-navy-200">/ TWR</span>
            </p>
          </div>
          <div>
            <p className="text-[10px] text-navy-200 uppercase tracking-widest">Controller</p>
            <p className="text-sm font-bold truncate">{user?.full_name ?? "—"}</p>
          </div>
          <div>
            <p className="text-[10px] text-navy-200 uppercase tracking-widest">Shift</p>
            {activeShift ? (
              <p className="text-sm font-bold">
                <span className="capitalize">{activeShift.shift_type}</span>
                <span className="text-emerald-300 font-mono ml-2">{formatDuration(activeShift.start_time, now.toISOString())}</span>
              </p>
            ) : (
              <p className="text-sm font-bold text-red-300 flex items-center gap-1">
                <AlertCircle size={12} /> Off duty
              </p>
            )}
          </div>
          <div>
            <p className="text-[10px] text-navy-200 uppercase tracking-widest">Local (WAT)</p>
            <p className="text-base font-mono font-bold text-amber-adr">{localTime}</p>
          </div>
          <div>
            <p className="text-[10px] text-navy-200 uppercase tracking-widest">UTC / Zulu</p>
            <p className="text-base font-mono font-bold text-emerald-300">{utcTime}Z</p>
          </div>
        </div>

        {/* No-shift banner */}
        {!activeShift && (
          <div className="bg-red-50 border-b-2 border-red-300 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-red-600" />
              <p className="text-sm text-red-800">
                <strong>You are off duty.</strong> Movements logged outside an active shift won't be linked to a shift record.
              </p>
            </div>
            <Link
              href="/operator/shifts"
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold uppercase text-xs tracking-widest px-4 py-2 rounded transition-colors"
            >
              <Clock size={12} /> Start Shift
            </Link>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto flex flex-col">
          <div className="p-6 space-y-5 max-w-7xl mx-auto w-full flex-1">

            {/* SECTION 1 — Flight ID (horizontal, all in one row) */}
            <section>
              <SectionHeader icon={Radio} label="Flight Identification" />
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-3">
                  <label className={labelClass}>Airline *</label>
                  <AirlineCombobox
                    value={airline}
                    onChange={(a) => { setAirline(a); setAirlineError(""); }}
                    error={airlineError}
                  />
                  {airlineError && <p className="text-red-500 text-[10px] mt-0.5">{airlineError}</p>}
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Flight # *</label>
                  <input
                    {...register("flight_number")}
                    className={`${inputClass} ${ACCENT.identity} font-bold text-base`}
                    placeholder="1234"
                    maxLength={5}
                  />
                  {errors.flight_number && <p className="text-red-500 text-[10px] mt-0.5">{errors.flight_number.message}</p>}
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Type *</label>
                  <select {...register("flight_type")} className={`${inputClass} ${ACCENT.identity} font-bold`}>
                    <option value="departure">↑ DEPARTURE</option>
                    <option value="arrival">↓ ARRIVAL</option>
                    <option value="overflight">→ OVERFLIGHT</option>
                    <option value="transit">⟷ TRANSIT</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Rule *</label>
                  <select {...register("flight_rule")} className={`${inputClass} ${ACCENT.identity}`}>
                    <option value="IFR">IFR</option>
                    <option value="VFR">VFR</option>
                    <option value="DVFR">DVFR</option>
                    <option value="SVFR">SVFR</option>
                  </select>
                </div>
                <div className="col-span-3">
                  <label className={labelClass}>Mvmt Date *</label>
                  <input type="date" {...register("movement_date")} className={`${inputClass} ${ACCENT.identity}`} />
                </div>
              </div>

              {/* Live callsign preview */}
              {previewCallsign && (
                <div className="mt-2 inline-flex items-center gap-2 bg-navy-50 border-l-4 border-navy-500 px-3 py-1.5 rounded-r">
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest">Callsign</span>
                  <span className="font-mono font-bold text-navy-700 tracking-wider">{previewCallsign}</span>
                </div>
              )}
            </section>

            {/* SECTION 2 — Route */}
            <section>
              <SectionHeader icon={Radar} label="Route" />
              <div className="grid grid-cols-12 gap-3 items-end">
                <div className="col-span-5">
                  <label className={labelClass}>Origin Airport</label>
                  <AerodromeCombobox value={origin} onChange={setOrigin} placeholder="Select origin…" />
                </div>
                <div className="col-span-1 flex items-center justify-center pb-1.5">
                  <span className="text-2xl font-bold text-sky-500">→</span>
                </div>
                <div className="col-span-5">
                  <label className={labelClass}>Destination Airport</label>
                  <AerodromeCombobox value={destination} onChange={setDestination} placeholder="Select destination…" />
                </div>
              </div>
            </section>

            {/* SECTION 3 — Aircraft & Payload */}
            <section>
              <SectionHeader icon={PlaneTakeoff} label="Aircraft & Payload" />
              <div className="grid grid-cols-12 gap-3 items-end">
                <div className="col-span-5">
                  <label className={labelClass}>Aircraft Type</label>
                  <AircraftTypeCombobox value={aircraft} onChange={setAircraft} placeholder="Select aircraft type…" />
                </div>
                <div className="col-span-3">
                  <label className={labelClass}>Registration</label>
                  <input {...register("registration")} className={`${inputClass} ${ACCENT.aircraft}`} placeholder="5N-ABC" />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Souls</label>
                  <input type="number" {...register("souls_on_board")} className={`${inputClass} ${ACCENT.payload}`} min={0} max={1000} placeholder="0" />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Fuel (kg)</label>
                  <input type="number" {...register("fuel_on_board_kg")} className={`${inputClass} ${ACCENT.payload}`} min={0} placeholder="0" />
                </div>
              </div>
            </section>

            {/* SECTION 4 — Movement Times (horizontal, conditional) */}
            <section>
              <SectionHeader
                icon={flightType === "arrival" ? PlaneLanding : PlaneTakeoff}
                label={`Movement Times — ${(flightType ?? "").toUpperCase()}`}
              />
              <div className="grid grid-cols-12 gap-3">
                {(flightType === "departure" || flightType === "transit") && (
                  <>
                    <TimeField name="aobt" label="AOBT" sublabel="Off-Block" register={register} accent={ACCENT.time} />
                    <TimeField name="atot" label="ATOT *" sublabel="Take-Off" register={register} accent={ACCENT.time} />
                    <TimeField name="atd" label="ATD" sublabel="Departure" register={register} accent={ACCENT.time} />
                  </>
                )}
                {flightType === "arrival" && (
                  <>
                    <TimeField name="ata" label="ATA *" sublabel="Arrival" register={register} accent={ACCENT.time} />
                    <TimeField name="aldt" label="ALDT" sublabel="Landing" register={register} accent={ACCENT.time} />
                    <TimeField name="aibt" label="AIBT" sublabel="In-Block" register={register} accent={ACCENT.time} />
                  </>
                )}
                {flightType === "transit" && (
                  <>
                    <TimeField name="ata" label="ATA" sublabel="Arrival" register={register} accent={ACCENT.time} />
                    <TimeField name="aldt" label="ALDT" sublabel="Landing" register={register} accent={ACCENT.time} />
                    <TimeField name="aibt" label="AIBT" sublabel="In-Block" register={register} accent={ACCENT.time} />
                  </>
                )}
                {flightType === "overflight" && (
                  <div className="col-span-12 bg-amber-50 border-l-4 border-amber-adr px-4 py-3 rounded">
                    <p className="text-xs text-amber-800 font-medium">
                      Overflights typically don't require movement times — submit with route data only.
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* SECTION 4 — Remarks */}
            <section>
              <SectionHeader icon={Activity} label="Remarks" />
              <textarea
                {...register("atc_remarks")}
                className={`w-full px-3 py-2 border-l-4 border-y border-r border-gray-200 bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-navy-500 rounded-r-md ${ACCENT.remarks}`}
                rows={2}
                placeholder="Optional remarks (delays, runway changes, weather notes)…"
              />
            </section>
          </div>

          {/* Bottom action bar */}
          <div className="bg-navy-500 px-6 py-4 flex items-center justify-between border-t-4 border-amber-adr sticky bottom-0">
            <div className="flex items-center gap-3">
              {successMsg ? (
                <p className="text-emerald-300 text-sm font-mono font-bold tracking-wide">{successMsg}</p>
              ) : (
                <p className="text-navy-200 text-xs uppercase tracking-widest">Ready to log movement</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => reset({ flight_type: "departure", flight_rule: "IFR", movement_date: today })}
                className="px-5 py-2.5 border-2 border-navy-300 text-navy-100 hover:bg-navy-400 font-bold uppercase text-xs tracking-widest rounded transition-colors"
              >
                Clear
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-8 py-2.5 bg-amber-adr hover:bg-yellow-400 disabled:bg-gray-400 text-navy-700 font-bold uppercase text-xs tracking-widest rounded transition-colors flex items-center gap-2"
              >
                <PlaneTakeoff size={14} />
                {submitting ? "Logging…" : "Record Movement"}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* RIGHT: Validation panel */}
      <aside className="w-72 border-l-2 border-navy-500 bg-white overflow-y-auto">
        <div className="bg-navy-500 px-4 py-3 text-white">
          <div className="flex items-center gap-2">
            <Activity size={14} className="text-amber-adr" />
            <h2 className="text-xs font-bold uppercase tracking-wider">Validation</h2>
          </div>
          <p className="text-[10px] text-navy-100 mt-0.5">
            {validationFlags.length === 0 ? "No issues" : `${validationFlags.length} issue(s)`}
          </p>
        </div>
        <div className="p-3">
          <ValidationPanel flags={validationFlags} />
        </div>
      </aside>

      {/* Detail modal */}
      <MovementDetailModal
        movementId={selectedMovementId}
        onClose={() => setSelectedMovementId(null)}
        onChanged={loadTodayMovements}
      />
    </div>
  );
}

// ===== sub-components =====

function StatPill({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="text-center">
      <p className={`font-mono font-bold text-base leading-none ${accent}`}>{value}</p>
      <p className="text-[9px] uppercase tracking-widest text-navy-200 mt-0.5 font-bold">{label}</p>
    </div>
  );
}

function SectionHeader({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-2 pb-1.5 border-b-2 border-navy-500">
      <Icon size={14} className="text-navy-500" />
      <h3 className="text-xs font-bold text-navy-500 uppercase tracking-widest">{label}</h3>
    </div>
  );
}

function TimeField({
  name, label, sublabel, register, accent,
}: {
  name: string;
  label: string;
  sublabel: string;
  register: ReturnType<typeof useForm<MovementFormData>>["register"];
  accent: string;
}) {
  return (
    <div className="col-span-3">
      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
        {label} <span className="text-gray-400 font-normal normal-case tracking-normal">({sublabel})</span>
      </label>
      <input
        type="datetime-local"
        {...register(name as keyof MovementFormData)}
        className={`w-full px-3 py-2 border-l-4 border-y border-r border-gray-200 bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-navy-500 rounded-r-md ${accent}`}
      />
    </div>
  );
}
