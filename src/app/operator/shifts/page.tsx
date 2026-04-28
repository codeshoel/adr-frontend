"use client";
import { useEffect, useState } from "react";
import {
  Clock, Sun, Sunset, Moon, Power, PlayCircle, FileText, Calendar, Radar, AlertCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { shiftsApi } from "@/lib/api/shifts";
import { useAuthStore } from "@/store/auth.store";
import { useShiftStore } from "@/store/shift.store";
import { formatDateTime, formatDuration, getApiErrorMessage } from "@/lib/utils";
import type { Shift, ShiftType } from "@/types";

const SHIFT_PRESETS: { value: ShiftType; label: string; window: string; icon: React.ElementType; color: string }[] = [
  { value: "morning",   label: "Morning",   window: "06:00 – 14:00", icon: Sun,    color: "border-amber-300 hover:border-amber-500 hover:bg-amber-50" },
  { value: "afternoon", label: "Afternoon", window: "14:00 – 22:00", icon: Sunset, color: "border-orange-300 hover:border-orange-500 hover:bg-orange-50" },
  { value: "night",     label: "Night",     window: "22:00 – 06:00", icon: Moon,   color: "border-indigo-300 hover:border-indigo-500 hover:bg-indigo-50" },
];

const SHIFT_BADGE: Record<ShiftType, { icon: React.ElementType; bg: string; label: string }> = {
  morning:   { icon: Sun,    bg: "bg-amber-100 text-amber-800",   label: "Morning" },
  afternoon: { icon: Sunset, bg: "bg-orange-100 text-orange-800", label: "Afternoon" },
  night:     { icon: Moon,   bg: "bg-indigo-100 text-indigo-800", label: "Night" },
};

export default function OperatorShiftsPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const setActiveShiftInStore = useShiftStore((s) => s.setActiveShift);
  const activeShift = useShiftStore((s) => s.activeShift);
  const [history, setHistory] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  // Start-shift form
  const [startForm, setStartForm] = useState<{ shift_type: ShiftType; notes: string }>({ shift_type: "morning", notes: "" });
  const [startSubmitting, setStartSubmitting] = useState(false);
  const [startError, setStartError] = useState("");

  // End-shift form
  const [endNotes, setEndNotes] = useState("");
  const [endSubmitting, setEndSubmitting] = useState(false);
  const [endError, setEndError] = useState("");

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [active, list] = await Promise.all([
        shiftsApi.getActive(),
        shiftsApi.list({ page: 1, page_size: 50 }),
      ]);
      setActiveShiftInStore(active.data ?? null);
      setHistory(list.data);
    } catch {
      setActiveShiftInStore(null);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  async function handleStart() {
    if (!user?.aerodrome_id) {
      setStartError("Your account isn't assigned to an aerodrome — contact admin");
      return;
    }
    setStartSubmitting(true);
    setStartError("");
    try {
      const { data: newShift } = await shiftsApi.start({
        shift_type: startForm.shift_type,
        aerodrome_id: user.aerodrome_id,
        notes: startForm.notes.trim() || undefined,
      });
      setActiveShiftInStore(newShift);
      setStartForm({ shift_type: "morning", notes: "" });
      await loadAll();
      // Send the operator straight to the flight log once their shift is open
      router.push("/operator");
    } catch (err: unknown) {
      setStartError(getApiErrorMessage(err, "Failed to start shift"));
    } finally {
      setStartSubmitting(false);
    }
  }

  async function handleEnd() {
    setEndSubmitting(true);
    setEndError("");
    try {
      await shiftsApi.end({ notes: endNotes.trim() || undefined });
      setEndNotes("");
      setActiveShiftInStore(null);
      await loadAll();
    } catch (err: unknown) {
      setEndError(getApiErrorMessage(err, "Failed to end shift"));
    } finally {
      setEndSubmitting(false);
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-navy-700">Shift Log</h2>
          <p className="text-xs text-gray-500 uppercase tracking-widest mt-0.5">
            Manage duty shifts · {user?.aerodrome_id ? "Assigned aerodrome" : "No aerodrome assigned"}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-mono text-navy-700 font-bold">
            {now.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Africa/Lagos", hour12: false })} WAT
          </span>
        </div>
      </div>

      {loading && <p className="text-sm text-gray-400">Loading…</p>}

      {!loading && activeShift && (
        <ActiveShiftCard
          shift={activeShift}
          now={now}
          endNotes={endNotes}
          setEndNotes={setEndNotes}
          onEnd={handleEnd}
          submitting={endSubmitting}
          error={endError}
        />
      )}

      {!loading && !activeShift && (
        <StartShiftCard
          startForm={startForm}
          setStartForm={setStartForm}
          onStart={handleStart}
          submitting={startSubmitting}
          error={startError}
          aerodromeAssigned={!!user?.aerodrome_id}
        />
      )}

      {/* History */}
      <ShiftHistoryCard shifts={history.filter((s) => !s.is_active)} loading={loading} />
    </div>
  );
}

// ===== Active shift =====

function ActiveShiftCard({
  shift, now, endNotes, setEndNotes, onEnd, submitting, error,
}: {
  shift: Shift; now: Date;
  endNotes: string; setEndNotes: (v: string) => void;
  onEnd: () => void; submitting: boolean; error: string;
}) {
  const badge = SHIFT_BADGE[shift.shift_type];
  const ShiftIcon = badge.icon;

  return (
    <div className="bg-white border-2 border-navy-500 rounded-xl shadow-lg overflow-hidden">
      {/* HUD header */}
      <div className="bg-navy-500 text-white px-6 py-4 flex items-center justify-between border-b-4 border-amber-adr">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-10 bg-amber-adr rounded-sm" />
          <div>
            <p className="text-[10px] text-navy-200 uppercase tracking-widest">On Duty</p>
            <h3 className="text-lg font-bold">Shift Active</h3>
          </div>
        </div>
        <div className="flex items-center gap-2 text-amber-adr">
          <span className="w-2 h-2 rounded-full bg-amber-adr animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-widest">Live</span>
        </div>
      </div>

      <div className="p-6 grid grid-cols-4 gap-6">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1">Type</p>
          <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded ${badge.bg}`}>
            <ShiftIcon size={14} />
            <span className="text-xs font-bold uppercase tracking-wider">{badge.label}</span>
          </div>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1">Started</p>
          <p className="font-mono text-sm font-bold text-navy-700">{formatDateTime(shift.start_time)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1">Duration</p>
          <p className="font-mono text-2xl font-bold text-emerald-600">
            {formatDuration(shift.start_time, now.toISOString())}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1">Aerodrome</p>
          <p className="font-mono text-sm font-bold text-navy-700">
            {shift.aerodrome?.icao_code ?? "—"}
          </p>
          <p className="text-xs text-gray-500 truncate">{shift.aerodrome?.name ?? ""}</p>
        </div>
      </div>

      {shift.notes && (
        <div className="px-6 pb-4">
          <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1">Start Notes</p>
          <p className="text-sm text-gray-700 bg-gray-50 border-l-2 border-gray-300 px-3 py-2 rounded">{shift.notes}</p>
        </div>
      )}

      {/* End shift */}
      <div className="border-t border-gray-100 px-6 py-4 bg-gray-50">
        <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-2">End Shift</p>
        <div className="flex gap-3 items-start">
          <textarea
            value={endNotes}
            onChange={(e) => setEndNotes(e.target.value)}
            rows={2}
            className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
            placeholder="Optional handover notes (incidents, pending items, weather)…"
          />
          <button
            onClick={onEnd}
            disabled={submitting}
            className="flex items-center gap-2 px-5 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-bold uppercase text-xs tracking-widest rounded transition-colors"
          >
            <Power size={14} />
            {submitting ? "Ending…" : "End Shift"}
          </button>
        </div>
        {error && (
          <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
            <AlertCircle size={12} /> {error}
          </p>
        )}
      </div>
    </div>
  );
}

// ===== Start shift =====

function StartShiftCard({
  startForm, setStartForm, onStart, submitting, error, aerodromeAssigned,
}: {
  startForm: { shift_type: ShiftType; notes: string };
  setStartForm: (v: { shift_type: ShiftType; notes: string }) => void;
  onStart: () => void; submitting: boolean; error: string; aerodromeAssigned: boolean;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="bg-navy-500 text-white px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-6 bg-amber-adr rounded-sm" />
          <h3 className="text-sm font-bold uppercase tracking-widest">Start New Shift</h3>
        </div>
        <span className="text-[10px] text-navy-200 uppercase tracking-widest">Off duty</span>
      </div>

      <div className="p-6 space-y-5">
        {!aerodromeAssigned && (
          <div className="bg-amber-50 border-l-4 border-amber-adr px-4 py-3 rounded">
            <p className="text-xs text-amber-800 flex items-center gap-2">
              <AlertCircle size={14} /> Your account isn't assigned to an aerodrome. Contact your administrator.
            </p>
          </div>
        )}

        {/* Shift type pickers */}
        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
            Shift Type
          </label>
          <div className="grid grid-cols-3 gap-3">
            {SHIFT_PRESETS.map((preset) => {
              const selected = startForm.shift_type === preset.value;
              const Icon = preset.icon;
              return (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setStartForm({ ...startForm, shift_type: preset.value })}
                  className={`border-2 rounded-lg p-4 text-left transition-all ${
                    selected
                      ? "border-navy-500 bg-navy-50 shadow"
                      : `border-gray-200 ${preset.color}`
                  }`}
                >
                  <Icon size={20} className={selected ? "text-navy-500" : "text-gray-500"} />
                  <p className={`text-sm font-bold mt-2 ${selected ? "text-navy-700" : "text-gray-700"}`}>
                    {preset.label}
                  </p>
                  <p className="text-[10px] font-mono text-gray-400 mt-0.5">{preset.window}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
            Pre-Shift Briefing Notes <span className="text-gray-400 font-normal normal-case tracking-normal">(optional)</span>
          </label>
          <textarea
            value={startForm.notes}
            onChange={(e) => setStartForm({ ...startForm, notes: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
            placeholder="Weather, NOTAMs, runway in use, equipment status…"
          />
        </div>

        {error && (
          <p className="text-xs text-red-600 flex items-center gap-1">
            <AlertCircle size={12} /> {error}
          </p>
        )}

        <div className="flex justify-end">
          <button
            onClick={onStart}
            disabled={submitting || !aerodromeAssigned}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-400 text-white font-bold uppercase text-xs tracking-widest rounded transition-colors"
          >
            <PlayCircle size={14} />
            {submitting ? "Starting…" : "Start Shift"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== History =====

function ShiftHistoryCard({ shifts, loading }: { shifts: Shift[]; loading: boolean }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-6 py-3 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-navy-500" />
          <h3 className="text-sm font-bold text-navy-700 uppercase tracking-widest">Shift History</h3>
        </div>
        <p className="text-[10px] text-gray-400 uppercase tracking-widest">{shifts.length} past shift{shifts.length !== 1 ? "s" : ""}</p>
      </div>

      {loading && <p className="text-center text-sm text-gray-400 py-6">Loading…</p>}

      {!loading && shifts.length === 0 && (
        <div className="text-center py-12">
          <Clock size={28} className="text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No past shifts yet</p>
        </div>
      )}

      {!loading && shifts.length > 0 && (
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-[10px] text-gray-500 uppercase tracking-widest">
              <th className="px-6 py-3">Type</th>
              <th>Start</th>
              <th>End</th>
              <th>Duration</th>
              <th>Aerodrome</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {shifts.map((s) => {
              const badge = SHIFT_BADGE[s.shift_type];
              const Icon = badge.icon;
              return (
                <tr key={s.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-6 py-3">
                    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded ${badge.bg}`}>
                      <Icon size={12} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">{badge.label}</span>
                    </div>
                  </td>
                  <td className="font-mono text-xs text-gray-600">{formatDateTime(s.start_time)}</td>
                  <td className="font-mono text-xs text-gray-600">{s.end_time ? formatDateTime(s.end_time) : "—"}</td>
                  <td className="font-mono text-xs font-bold text-navy-700">{formatDuration(s.start_time, s.end_time)}</td>
                  <td className="font-mono text-xs">{s.aerodrome?.icao_code ?? "—"}</td>
                  <td className="text-xs text-gray-500 max-w-xs truncate">{s.notes ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
