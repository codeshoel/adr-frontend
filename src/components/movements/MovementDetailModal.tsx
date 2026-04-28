"use client";
import { useEffect, useState } from "react";
import {
  X, PlaneTakeoff, PlaneLanding, Plane, Users, Fuel, FileText,
  AlertTriangle, CheckCircle, Clock, History, Pencil, Send, Save, Trash2,
} from "lucide-react";
import { movementsApi } from "@/lib/api/movements";
import { aisApi } from "@/lib/api/ais";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatDate, formatDateTime, formatTime, getApiErrorMessage } from "@/lib/utils";
import { FLIGHT_TYPE_LABELS, SEVERITY_CONFIG } from "@/lib/constants";
import { useAuthStore } from "@/store/auth.store";
import type { Movement, MovementHistoryEntry } from "@/types";

type EditableFields = {
  origin_icao: string;
  destination_icao: string;
  registration: string;
  atd: string;
  ata: string;
  aobt: string;
  aibt: string;
  atot: string;
  aldt: string;
  taxi_out_minutes: string;
  taxi_in_minutes: string;
  souls_on_board: string;
  fuel_on_board_kg: string;
  cargo_kg: string;
  atc_remarks: string;
};

const EMPTY_EDIT: EditableFields = {
  origin_icao: "", destination_icao: "", registration: "",
  atd: "", ata: "", aobt: "", aibt: "", atot: "", aldt: "",
  taxi_out_minutes: "", taxi_in_minutes: "",
  souls_on_board: "", fuel_on_board_kg: "", cargo_kg: "",
  atc_remarks: "",
};

function toLocalInput(iso: string | null): string {
  // datetime-local input expects "YYYY-MM-DDTHH:MM"
  if (!iso) return "";
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 16);
}

function buildEditState(m: Movement): EditableFields {
  return {
    origin_icao: m.origin_icao ?? "",
    destination_icao: m.destination_icao ?? "",
    registration: m.registration ?? "",
    atd: toLocalInput(m.atd),
    ata: toLocalInput(m.ata),
    aobt: toLocalInput(m.aobt),
    aibt: toLocalInput(m.aibt),
    atot: toLocalInput(m.atot),
    aldt: toLocalInput(m.aldt),
    taxi_out_minutes: m.taxi_out_minutes?.toString() ?? "",
    taxi_in_minutes: m.taxi_in_minutes?.toString() ?? "",
    souls_on_board: m.souls_on_board?.toString() ?? "",
    fuel_on_board_kg: m.fuel_on_board_kg?.toString() ?? "",
    cargo_kg: m.cargo_kg?.toString() ?? "",
    atc_remarks: m.atc_remarks ?? "",
  };
}

interface MovementDetailModalProps {
  movementId: string | null;
  onClose: () => void;
  onChanged?: () => void;
}

export function MovementDetailModal({ movementId, onClose, onChanged }: MovementDetailModalProps) {
  const { user } = useAuthStore();
  const [movement, setMovement] = useState<Movement | null>(null);
  const [history, setHistory] = useState<MovementHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"overview" | "history">("overview");
  const [decision, setDecision] = useState<"approve" | "reject" | null>(null);
  const [remarks, setRemarks] = useState("");
  const [acting, setActing] = useState(false);
  const [actionMsg, setActionMsg] = useState("");
  // Edit mode
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<EditableFields>(EMPTY_EDIT);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [confirmingAis, setConfirmingAis] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!movementId) {
      setMovement(null);
      setHistory([]);
      setDecision(null);
      setRemarks("");
      setActionMsg("");
      setTab("overview");
      setEditing(false);
      setEditForm(EMPTY_EDIT);
      setSaveError("");
      return;
    }
    setLoading(true);
    setEditing(false);
    Promise.all([movementsApi.get(movementId), movementsApi.history(movementId)])
      .then(([m, h]) => {
        setMovement(m.data);
        setEditForm(buildEditState(m.data));
        setHistory(h.data as MovementHistoryEntry[]);
      })
      .catch(() => setMovement(null))
      .finally(() => setLoading(false));
  }, [movementId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (movementId) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [movementId, onClose]);

  if (!movementId) return null;

  const canSupervise =
    movement && user &&
    (user.role === "supervisor" || user.role === "system_admin") &&
    ["submitted", "flagged", "under_review"].includes(movement.status) &&
    movement.entered_by_id !== user.id;

  // Editable when status is DRAFT and the user owns it (or is admin/supervisor of same aerodrome)
  const canEdit =
    movement && user &&
    movement.status === "draft" &&
    (
      user.role === "system_admin" ||
      movement.entered_by_id === user.id ||
      (user.role === "supervisor" && user.aerodrome_id === movement.aerodrome_id)
    );

  // ATC operators (or supervisors at same aerodrome) can confirm AIS data
  const canConfirmAis =
    movement && user &&
    !movement.is_ais_confirmed &&
    !!movement.ais_eobt &&
    (
      user.role === "system_admin" ||
      user.role === "atc_operator" ||
      (user.role === "supervisor" && user.aerodrome_id === movement.aerodrome_id)
    );

  async function handleDelete() {
    if (!movement) return;
    setDeleting(true);
    setSaveError("");
    try {
      await movementsApi.delete(movement.id);
      onChanged?.();
      onClose();
    } catch (err: unknown) {
      setSaveError(getApiErrorMessage(err, "Failed to delete draft"));
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  }

  async function handleConfirmAis() {
    if (!movement) return;
    setConfirmingAis(true);
    setSaveError("");
    try {
      await aisApi.confirm(movement.id);
      const refreshed = await movementsApi.get(movement.id);
      setMovement(refreshed.data);
      onChanged?.();
    } catch (err: unknown) {
      setSaveError(getApiErrorMessage(err, "Failed to confirm AIS data"));
    } finally {
      setConfirmingAis(false);
    }
  }

  async function handleSave() {
    if (!movement) return;
    setSaving(true);
    setSaveError("");
    try {
      const payload: Record<string, unknown> = {
        origin_icao: editForm.origin_icao.trim().toUpperCase() || undefined,
        destination_icao: editForm.destination_icao.trim().toUpperCase() || undefined,
        registration: editForm.registration.trim().toUpperCase() || undefined,
        atd: editForm.atd ? new Date(editForm.atd).toISOString() : undefined,
        ata: editForm.ata ? new Date(editForm.ata).toISOString() : undefined,
        aobt: editForm.aobt ? new Date(editForm.aobt).toISOString() : undefined,
        aibt: editForm.aibt ? new Date(editForm.aibt).toISOString() : undefined,
        atot: editForm.atot ? new Date(editForm.atot).toISOString() : undefined,
        aldt: editForm.aldt ? new Date(editForm.aldt).toISOString() : undefined,
        taxi_out_minutes: editForm.taxi_out_minutes ? Number(editForm.taxi_out_minutes) : undefined,
        taxi_in_minutes: editForm.taxi_in_minutes ? Number(editForm.taxi_in_minutes) : undefined,
        souls_on_board: editForm.souls_on_board ? Number(editForm.souls_on_board) : undefined,
        fuel_on_board_kg: editForm.fuel_on_board_kg ? Number(editForm.fuel_on_board_kg) : undefined,
        cargo_kg: editForm.cargo_kg ? Number(editForm.cargo_kg) : undefined,
        atc_remarks: editForm.atc_remarks.trim() || undefined,
      };
      // Strip undefined values so the partial-update endpoint sees only what changed
      Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

      const { data: updated } = await movementsApi.update(movement.id, payload);
      setMovement(updated);
      setEditForm(buildEditState(updated));
      setEditing(false);
      const h = await movementsApi.history(movement.id);
      setHistory(h.data as MovementHistoryEntry[]);
      onChanged?.();
    } catch (err: unknown) {
      setSaveError(getApiErrorMessage(err, "Failed to save changes"));
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmitForReview() {
    if (!movement) return;
    setSaving(true);
    setSaveError("");
    try {
      const { data: updated } = await movementsApi.submit(movement.id);
      setMovement(updated);
      const h = await movementsApi.history(movement.id);
      setHistory(h.data as MovementHistoryEntry[]);
      onChanged?.();
    } catch (err: unknown) {
      setSaveError(getApiErrorMessage(err, "Failed to submit"));
    } finally {
      setSaving(false);
    }
  }

  function setField<K extends keyof EditableFields>(key: K, value: string) {
    setEditForm((p) => ({ ...p, [key]: value }));
  }

  async function handleDecision() {
    if (!movement || !decision || remarks.trim().length < 5) return;
    setActing(true);
    setActionMsg("");
    try {
      await movementsApi.approve(movement.id, decision, remarks);
      setActionMsg(`Movement ${decision}d`);
      const refreshed = await movementsApi.get(movement.id);
      setMovement(refreshed.data);
      setDecision(null);
      setRemarks("");
      onChanged?.();
    } catch (err: unknown) {
      setActionMsg(getApiErrorMessage(err, "Action failed"));
    } finally {
      setActing(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-white w-full max-w-3xl max-h-[92vh] rounded-xl shadow-2xl border-2 border-navy-500 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {loading && (
          <div className="p-12 text-center text-gray-400">Loading flight…</div>
        )}

        {!loading && !movement && (
          <div className="p-12 text-center text-gray-400">Movement not found</div>
        )}

        {!loading && movement && (
          <>
            {/* HERO — callsign, status, close */}
            <div className="bg-navy-500 text-white px-6 py-4 flex items-start justify-between">
              <div className="flex-1">
                <p className="text-[10px] text-navy-200 uppercase tracking-widest mb-1">
                  {movement.airline?.name ?? "Unknown airline"}
                </p>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-3xl font-bold tracking-wider">{movement.callsign}</span>
                  <span className="bg-amber-adr text-navy-700 px-2 py-0.5 rounded text-[10px] font-bold tracking-widest">
                    {FLIGHT_TYPE_LABELS[movement.flight_type]}
                  </span>
                  <StatusBadge status={movement.status} />
                </div>
                <p className="text-xs text-navy-200 mt-1">
                  {formatDate(movement.movement_date)} · {movement.flight_rule}
                  {movement.aircraft_type && (
                    <> · {movement.aircraft_type.icao_designator} ({movement.aircraft_type.manufacturer} {movement.aircraft_type.model})</>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {canEdit && !editing && (
                  <button
                    onClick={() => setEditing(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-adr text-navy-700 hover:bg-yellow-400 font-bold uppercase text-[10px] tracking-widest rounded transition-colors"
                  >
                    <Pencil size={12} />
                    Edit Draft
                  </button>
                )}
                {canEdit && !editing && (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    title="Delete draft"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white hover:bg-red-700 font-bold uppercase text-[10px] tracking-widest rounded transition-colors"
                  >
                    <Trash2 size={12} />
                    Delete
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-1.5 hover:bg-navy-400 rounded-full transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* ROUTE VISUALIZATION */}
            <div className="bg-gradient-to-r from-sky-50 via-white to-sky-50 px-6 py-5 border-b border-gray-200">
              <RouteVisual movement={movement} />
            </div>

            {/* QUICK STATS */}
            <div className="grid grid-cols-4 divide-x divide-gray-100 border-b border-gray-200">
              <Stat icon={Users} label="Souls" value={movement.souls_on_board?.toLocaleString() ?? "—"} />
              <Stat icon={Fuel} label="Fuel" value={movement.fuel_on_board_kg ? `${movement.fuel_on_board_kg.toLocaleString()} kg` : "—"} />
              <Stat icon={Plane} label="Registration" value={movement.registration ?? "—"} mono />
              <Stat
                icon={movement.validation_flags.length > 0 ? AlertTriangle : CheckCircle}
                label="Validation"
                value={movement.validation_flags.length > 0 ? `${movement.validation_flags.length} issue(s)` : "Clean"}
                color={movement.validation_flags.length > 0 ? "text-amber-700" : "text-emerald-600"}
              />
            </div>

            {/* TABS */}
            <div className="flex border-b border-gray-200 px-6">
              <TabButton active={tab === "overview"} onClick={() => setTab("overview")}>Overview</TabButton>
              <TabButton active={tab === "history"} onClick={() => setTab("history")}>
                History {history.length > 0 && <span className="ml-1 text-[10px] bg-gray-200 px-1.5 rounded-full">{history.length}</span>}
              </TabButton>
            </div>

            {/* CONTENT */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {tab === "overview" && editing && (
                <EditForm
                  flightType={movement.flight_type}
                  form={editForm}
                  onChange={setField}
                />
              )}

              {tab === "overview" && !editing && (
                <>
                  {/* TIMELINE */}
                  {movement.flight_type !== "overflight" && (
                    <Card title="Movement Times" icon={Clock}>
                      <Timeline movement={movement} />
                    </Card>
                  )}

                  {/* VALIDATION FLAGS */}
                  {movement.validation_flags.length > 0 && (
                    <Card title="Validation Issues" icon={AlertTriangle} accent="border-l-amber-500">
                      <ul className="space-y-1.5">
                        {movement.validation_flags.map((f) => {
                          const cfg = SEVERITY_CONFIG[f.severity];
                          return (
                            <li key={f.id} className={`text-xs px-3 py-2 rounded border-l-4 ${cfg.className}`}>
                              <span className="font-bold uppercase tracking-wider mr-2">[{cfg.label}]</span>
                              {f.flag_message}
                              {f.field_name && <span className="text-gray-500 ml-2">· {f.field_name}</span>}
                            </li>
                          );
                        })}
                      </ul>
                    </Card>
                  )}

                  {/* REMARKS */}
                  {(movement.atc_remarks || movement.supervisor_remarks) && (
                    <Card title="Remarks" icon={FileText}>
                      {movement.atc_remarks && (
                        <div className="border-l-2 border-gray-300 pl-3 py-1">
                          <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">ATC</p>
                          <p className="text-sm text-gray-700">{movement.atc_remarks}</p>
                        </div>
                      )}
                      {movement.supervisor_remarks && (
                        <div className="border-l-2 border-navy-500 pl-3 py-1 mt-2">
                          <p className="text-[10px] uppercase tracking-widest text-navy-500 font-bold">Supervisor</p>
                          <p className="text-sm text-gray-700">{movement.supervisor_remarks}</p>
                        </div>
                      )}
                    </Card>
                  )}

                  {/* AIS DATA — only if AIS pre-populated */}
                  {(movement.ais_eobt || movement.ais_aircraft_type_code) && (
                    <Card title="AIS Pre-Population" icon={Plane} accent="border-l-cyan-500">
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <MiniStat label="AIS EOBT" value={formatTime(movement.ais_eobt)} mono />
                        <MiniStat label="AIS Aircraft" value={movement.ais_aircraft_type_code ?? "—"} mono />
                        <MiniStat
                          label="ATC Confirmed"
                          value={movement.is_ais_confirmed ? "Yes" : "No"}
                          color={movement.is_ais_confirmed ? "text-emerald-600" : "text-amber-600"}
                        />
                      </div>
                      {movement.has_discrepancy && (
                        <p className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded mt-3">
                          ⚠ Discrepancy detected between AIS and ATC data
                        </p>
                      )}
                      {!movement.is_ais_confirmed && canConfirmAis && (
                        <div className="mt-3 flex items-center justify-between bg-cyan-50 border-l-4 border-cyan-500 rounded px-3 py-2">
                          <p className="text-xs text-cyan-800">
                            Verify AIS data above is accurate, then confirm.
                          </p>
                          <button
                            onClick={handleConfirmAis}
                            disabled={confirmingAis}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-400 text-white font-bold uppercase text-[10px] tracking-widest rounded"
                          >
                            <CheckCircle size={11} />
                            {confirmingAis ? "Confirming…" : "Confirm AIS Data"}
                          </button>
                        </div>
                      )}
                    </Card>
                  )}

                  {/* ATTRIBUTION */}
                  <Card title="Attribution" icon={Users}>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Entered by</p>
                        <p className="text-sm text-gray-800 font-medium">{movement.entered_by?.full_name ?? "—"}</p>
                        <p className="text-xs text-gray-400 font-mono">{formatDateTime(movement.created_at)}</p>
                      </div>
                      {movement.approved_by && (
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Approved by</p>
                          <p className="text-sm text-gray-800 font-medium">{movement.approved_by.full_name}</p>
                          <p className="text-xs text-gray-400 font-mono">{formatDateTime(movement.updated_at)}</p>
                        </div>
                      )}
                    </div>
                  </Card>
                </>
              )}

              {tab === "history" && (
                <Card title="Audit Trail" icon={History}>
                  {history.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">No history recorded</p>
                  ) : (
                    <ul className="relative pl-5 space-y-3 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-gray-200">
                      {history.map((h) => (
                        <li key={h.id} className="relative">
                          <span className="absolute -left-[17px] top-1 w-3 h-3 rounded-full bg-navy-500 border-2 border-white" />
                          <p className="text-sm font-bold text-navy-700 uppercase tracking-wider">{h.action}</p>
                          <p className="text-xs text-gray-500 font-mono">{formatDateTime(h.timestamp)}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              )}
            </div>

            {/* EDIT MODE FOOTER */}
            {editing && (
              <div className="bg-navy-500 px-6 py-3 border-t-4 border-amber-adr flex items-center justify-between">
                <div>
                  {saveError && (
                    <p className="text-amber-adr text-xs font-bold">{saveError}</p>
                  )}
                  {!saveError && (
                    <p className="text-navy-100 text-xs uppercase tracking-widest">
                      Editing draft — make changes then save
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditing(false);
                      if (movement) setEditForm(buildEditState(movement));
                      setSaveError("");
                    }}
                    disabled={saving}
                    className="px-4 py-1.5 border border-navy-300 text-navy-100 hover:bg-navy-400 font-bold uppercase text-xs tracking-widest rounded"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-5 py-1.5 bg-amber-adr hover:bg-yellow-400 disabled:bg-gray-400 text-navy-700 font-bold uppercase text-xs tracking-widest rounded transition-colors"
                  >
                    <Save size={12} />
                    {saving ? "Saving…" : "Save Changes"}
                  </button>
                </div>
              </div>
            )}

            {/* SUBMIT-FOR-REVIEW FOOTER (draft, owner, not editing) */}
            {!editing && canEdit && (
              <div className="bg-navy-500 px-6 py-3 border-t-4 border-amber-adr flex items-center justify-between">
                <div>
                  {saveError && (
                    <p className="text-amber-adr text-xs font-bold">{saveError}</p>
                  )}
                  {!saveError && (
                    <p className="text-navy-100 text-xs uppercase tracking-widest">
                      This draft is ready when you are — submit for supervisor review
                    </p>
                  )}
                </div>
                <button
                  onClick={handleSubmitForReview}
                  disabled={saving || (movement?.validation_flags.some((f) => !f.is_resolved && (f.severity === "error" || f.severity === "critical")) ?? false)}
                  className="flex items-center gap-1.5 px-5 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-400 text-white font-bold uppercase text-xs tracking-widest rounded transition-colors"
                  title={
                    movement?.validation_flags.some((f) => !f.is_resolved && (f.severity === "error" || f.severity === "critical"))
                      ? "Resolve all errors before submitting"
                      : ""
                  }
                >
                  <Send size={12} />
                  {saving ? "Submitting…" : "Submit for Review"}
                </button>
              </div>
            )}

            {/* SUPERVISOR ACTION FOOTER */}
            {!editing && canSupervise && (
              <div className="bg-navy-500 px-6 py-3 border-t-4 border-amber-adr">
                {!decision && (
                  <div className="flex items-center justify-between">
                    <p className="text-navy-100 text-xs uppercase tracking-widest">Supervisor action required</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setDecision("reject")}
                        className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold uppercase text-xs tracking-widest rounded"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => setDecision("approve")}
                        className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold uppercase text-xs tracking-widest rounded"
                      >
                        Approve
                      </button>
                    </div>
                  </div>
                )}
                {decision && (
                  <div className="space-y-2">
                    <p className="text-amber-adr text-xs font-bold uppercase tracking-widest">
                      {decision === "approve" ? "Approving" : "Rejecting"} — provide remarks
                    </p>
                    <textarea
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="Required (min 5 characters)…"
                      rows={2}
                      className="w-full px-3 py-2 text-sm bg-white rounded focus:outline-none"
                    />
                    {actionMsg && <p className="text-xs text-amber-adr">{actionMsg}</p>}
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => { setDecision(null); setRemarks(""); }}
                        className="px-4 py-1.5 border border-navy-300 text-navy-100 hover:bg-navy-400 font-bold uppercase text-xs tracking-widest rounded"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDecision}
                        disabled={acting || remarks.trim().length < 5}
                        className={`px-5 py-1.5 font-bold uppercase text-xs tracking-widest rounded disabled:bg-gray-400 ${
                          decision === "approve"
                            ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                            : "bg-red-600 hover:bg-red-700 text-white"
                        }`}
                      >
                        {acting ? "Processing…" : `Confirm ${decision === "approve" ? "Approve" : "Reject"}`}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Delete-confirmation overlay */}
        {confirmDelete && movement && (
          <div className="absolute inset-0 z-10 bg-navy-900/80 backdrop-blur-sm flex items-center justify-center rounded-xl">
            <div className="bg-white rounded-lg border-2 border-red-500 max-w-sm w-full mx-4 overflow-hidden">
              <div className="bg-red-600 text-white px-5 py-3">
                <div className="flex items-center gap-2">
                  <Trash2 size={16} />
                  <h3 className="text-sm font-bold uppercase tracking-widest">Delete Draft</h3>
                </div>
              </div>
              <div className="p-5">
                <p className="text-sm text-gray-700">
                  Are you sure you want to delete the draft for{" "}
                  <span className="font-mono font-bold text-navy-700">{movement.callsign}</span>?
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  This action cannot be undone. The draft and any unresolved validation flags will be removed.
                </p>
                {saveError && (
                  <p className="text-xs text-red-600 mt-3">{saveError}</p>
                )}
                <div className="flex justify-end gap-2 mt-4">
                  <button
                    onClick={() => { setConfirmDelete(false); setSaveError(""); }}
                    disabled={deleting}
                    className="px-4 py-1.5 border border-gray-300 text-gray-700 hover:bg-gray-50 font-bold uppercase text-xs tracking-widest rounded"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-bold uppercase text-xs tracking-widest rounded"
                  >
                    <Trash2 size={11} />
                    {deleting ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ===== sub-components =====

function RouteVisual({ movement }: { movement: Movement }) {
  const origin = movement.origin_icao ?? "—";
  const dest = movement.destination_icao ?? "—";
  const isDeparture = movement.flight_type === "departure";

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="text-center flex-1">
        <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">From</p>
        <p className="font-mono text-3xl font-bold text-navy-700 mt-0.5">{origin}</p>
      </div>

      <div className="flex-1 flex flex-col items-center">
        <div className="relative w-full">
          <div className="border-t-2 border-dashed border-sky-400 w-full" />
          <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 bg-white rounded-full p-1 border border-sky-300">
            {isDeparture ? (
              <PlaneTakeoff size={20} className="text-sky-500" />
            ) : (
              <PlaneLanding size={20} className="text-sky-500" />
            )}
          </div>
        </div>
        <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mt-2">
          {movement.flight_rule} · {FLIGHT_TYPE_LABELS[movement.flight_type]}
        </p>
      </div>

      <div className="text-center flex-1">
        <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">To</p>
        <p className="font-mono text-3xl font-bold text-navy-700 mt-0.5">{dest}</p>
      </div>
    </div>
  );
}

function Timeline({ movement }: { movement: Movement }) {
  // Build event list based on flight type
  type Event = { label: string; time: string | null; sublabel?: string };
  let events: Event[] = [];

  if (movement.flight_type === "departure" || movement.flight_type === "transit") {
    events = [
      { label: "AOBT", sublabel: "Off-Block", time: movement.aobt },
      { label: "ATOT", sublabel: "Take-Off", time: movement.atot },
      { label: "ATD", sublabel: "Departure", time: movement.atd },
    ];
  } else if (movement.flight_type === "arrival") {
    events = [
      { label: "ATA", sublabel: "Arrival", time: movement.ata },
      { label: "ALDT", sublabel: "Landing", time: movement.aldt },
      { label: "AIBT", sublabel: "In-Block", time: movement.aibt },
    ];
  }

  if (movement.flight_type === "transit") {
    events = [
      ...events,
      { label: "ATA", sublabel: "Arrival", time: movement.ata },
      { label: "ALDT", sublabel: "Landing", time: movement.aldt },
      { label: "AIBT", sublabel: "In-Block", time: movement.aibt },
    ];
  }

  return (
    <div className="flex items-center justify-between">
      {events.map((event, i) => (
        <div key={i} className="flex items-center flex-1">
          <div className="text-center flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{event.label}</p>
            <p className={`font-mono text-lg font-bold mt-0.5 ${event.time ? "text-emerald-600" : "text-gray-300"}`}>
              {event.time ? formatTime(event.time) : "— —"}
            </p>
            {event.sublabel && <p className="text-[9px] text-gray-400 mt-0.5">{event.sublabel}</p>}
          </div>
          {i < events.length - 1 && (
            <div className="text-emerald-300 text-xl">→</div>
          )}
        </div>
      ))}
      {events.length === 0 && (
        <p className="text-sm text-gray-400 italic">No times recorded</p>
      )}
    </div>
  );
}

function Stat({
  icon: Icon, label, value, mono = false, color,
}: { icon: React.ElementType; label: string; value: string; mono?: boolean; color?: string }) {
  return (
    <div className="px-4 py-3 text-center">
      <div className="flex items-center justify-center gap-1.5">
        <Icon size={11} className="text-gray-400" />
        <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">{label}</p>
      </div>
      <p className={`text-base font-bold mt-1 ${mono ? "font-mono" : ""} ${color ?? "text-navy-700"}`}>{value}</p>
    </div>
  );
}

function MiniStat({ label, value, mono, color }: { label: string; value: string; mono?: boolean; color?: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">{label}</p>
      <p className={`text-sm font-medium mt-0.5 ${mono ? "font-mono" : ""} ${color ?? "text-gray-800"}`}>{value}</p>
    </div>
  );
}

function Card({
  title, icon: Icon, accent = "border-l-navy-500", children,
}: { title: string; icon: React.ElementType; accent?: string; children: React.ReactNode }) {
  return (
    <div className={`bg-white border border-gray-200 border-l-4 ${accent} rounded-r-md p-4`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon size={14} className="text-navy-500" />
        <h3 className="text-[11px] font-bold text-navy-700 uppercase tracking-widest">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function TabButton({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 text-xs font-bold uppercase tracking-widest border-b-2 transition-colors ${
        active ? "text-navy-700 border-amber-adr" : "text-gray-400 border-transparent hover:text-gray-600"
      }`}
    >
      {children}
    </button>
  );
}

// ===== Edit form =====

function EditForm({
  flightType, form, onChange,
}: {
  flightType: Movement["flight_type"];
  form: EditableFields;
  onChange: <K extends keyof EditableFields>(key: K, value: string) => void;
}) {
  const showDeparture = flightType === "departure" || flightType === "transit";
  const showArrival = flightType === "arrival" || flightType === "transit";
  const inputCls = "w-full px-3 py-2 border-l-4 border-y border-r border-gray-200 bg-white text-sm font-mono uppercase tracking-wide focus:outline-none focus:ring-2 focus:ring-navy-500 rounded-r-md";
  const labelCls = "block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1";

  return (
    <div className="space-y-5">
      <Card title="Route" icon={Plane} accent="border-l-sky-500">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Origin (ICAO)</label>
            <input
              value={form.origin_icao}
              onChange={(e) => onChange("origin_icao", e.target.value)}
              className={`${inputCls} border-l-sky-500`}
              placeholder="DNMM" maxLength={4}
            />
          </div>
          <div>
            <label className={labelCls}>Destination (ICAO)</label>
            <input
              value={form.destination_icao}
              onChange={(e) => onChange("destination_icao", e.target.value)}
              className={`${inputCls} border-l-sky-500`}
              placeholder="DNAA" maxLength={4}
            />
          </div>
          <div>
            <label className={labelCls}>Registration</label>
            <input
              value={form.registration}
              onChange={(e) => onChange("registration", e.target.value)}
              className={`${inputCls} border-l-amber-500`}
              placeholder="5N-ABC"
            />
          </div>
        </div>
      </Card>

      {flightType !== "overflight" && (
        <Card title="Movement Times" icon={Clock} accent="border-l-emerald-500">
          <div className="grid grid-cols-3 gap-3">
            {showDeparture && (
              <>
                <TimeInput label="AOBT" sublabel="Off-Block" value={form.aobt} onChange={(v) => onChange("aobt", v)} />
                <TimeInput label="ATOT" sublabel="Take-Off" value={form.atot} onChange={(v) => onChange("atot", v)} />
                <TimeInput label="ATD" sublabel="Departure" value={form.atd} onChange={(v) => onChange("atd", v)} />
              </>
            )}
            {showArrival && (
              <>
                <TimeInput label="ATA" sublabel="Arrival" value={form.ata} onChange={(v) => onChange("ata", v)} />
                <TimeInput label="ALDT" sublabel="Landing" value={form.aldt} onChange={(v) => onChange("aldt", v)} />
                <TimeInput label="AIBT" sublabel="In-Block" value={form.aibt} onChange={(v) => onChange("aibt", v)} />
              </>
            )}
            {showDeparture && (
              <div>
                <label className={labelCls}>Taxi Out (min)</label>
                <input
                  type="number" min={0}
                  value={form.taxi_out_minutes}
                  onChange={(e) => onChange("taxi_out_minutes", e.target.value)}
                  className={`${inputCls} border-l-emerald-500`}
                />
              </div>
            )}
            {showArrival && (
              <div>
                <label className={labelCls}>Taxi In (min)</label>
                <input
                  type="number" min={0}
                  value={form.taxi_in_minutes}
                  onChange={(e) => onChange("taxi_in_minutes", e.target.value)}
                  className={`${inputCls} border-l-emerald-500`}
                />
              </div>
            )}
          </div>
        </Card>
      )}

      <Card title="Payload" icon={Users} accent="border-l-purple-500">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Souls on Board</label>
            <input
              type="number" min={0} max={1000}
              value={form.souls_on_board}
              onChange={(e) => onChange("souls_on_board", e.target.value)}
              className={`${inputCls} border-l-purple-500`}
            />
          </div>
          <div>
            <label className={labelCls}>Fuel (kg)</label>
            <input
              type="number" min={0}
              value={form.fuel_on_board_kg}
              onChange={(e) => onChange("fuel_on_board_kg", e.target.value)}
              className={`${inputCls} border-l-purple-500`}
            />
          </div>
          <div>
            <label className={labelCls}>Cargo (kg)</label>
            <input
              type="number" min={0}
              value={form.cargo_kg}
              onChange={(e) => onChange("cargo_kg", e.target.value)}
              className={`${inputCls} border-l-purple-500`}
            />
          </div>
        </div>
      </Card>

      <Card title="Remarks" icon={FileText} accent="border-l-gray-400">
        <textarea
          value={form.atc_remarks}
          onChange={(e) => onChange("atc_remarks", e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border-l-4 border-y border-r border-gray-200 bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-navy-500 rounded-r-md border-l-gray-400"
          placeholder="Delays, runway changes, weather notes…"
        />
      </Card>
    </div>
  );
}

function TimeInput({
  label, sublabel, value, onChange,
}: { label: string; sublabel: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
        {label} <span className="text-gray-400 font-normal normal-case tracking-normal">({sublabel})</span>
      </label>
      <input
        type="datetime-local"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border-l-4 border-l-emerald-500 border-y border-r border-gray-200 bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-navy-500 rounded-r-md"
      />
    </div>
  );
}
