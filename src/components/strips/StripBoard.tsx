"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Wifi, WifiOff, Eye } from "lucide-react";
import type { FlightStrip, StripFlightType } from "@/types";
import { stripsApi, openStripStream } from "@/lib/api/strips";
import { BOARD_COLUMNS, advancesToColumn } from "@/lib/strips/phases";
import { SearchSelectBar } from "./SearchSelectBar";
import { NewStripForm } from "./NewStripForm";
import { StripEditModal } from "./StripEditModal";
import { StripDetailsModal } from "./StripDetailsModal";
import { StripCard } from "./StripCard";
import { useDialog } from "@/components/ui/DialogProvider";

export function StripBoard({ readOnly = false }: { readOnly?: boolean }) {
  const dialog = useDialog();
  const [strips, setStrips] = useState<FlightStrip[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [flightType, setFlightType] = useState<StripFlightType>("departure");
  const [formOpen, setFormOpen] = useState(false);
  const [formCallsign, setFormCallsign] = useState("");
  const [editStrip, setEditStrip] = useState<FlightStrip | null>(null);
  const [viewStrip, setViewStrip] = useState<FlightStrip | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const draggingRef = useRef<FlightStrip | null>(null);
  const refetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refetch = useCallback(async () => {
    try {
      const { data } = await stripsApi.active();
      setStrips(data);
    } catch {
      /* keep last known board */
    }
  }, []);

  const scheduleRefetch = useCallback(() => {
    if (refetchTimer.current) clearTimeout(refetchTimer.current);
    refetchTimer.current = setTimeout(refetch, 150);
  }, [refetch]);

  useEffect(() => {
    refetch();
    const es = openStripStream((evt) => {
      setLive(true);
      if (evt.type === "snapshot") refetch();
      else scheduleRefetch();
    });
    if (es) {
      es.onopen = () => setLive(true);
      es.onerror = () => setLive(false);
    }
    return () => {
      es?.close();
      if (refetchTimer.current) clearTimeout(refetchTimer.current);
    };
  }, [refetch, scheduleRefetch]);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  function onCreated(strip: FlightStrip) {
    setStrips((prev) => [...prev, strip]);
    flash(`Strip ${strip.callsign ?? ""} opened`);
  }

  async function withBusy(id: string, fn: () => Promise<void>) {
    setBusyId(id);
    try {
      await fn();
    } catch (e: unknown) {
      flash((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Action failed");
    } finally {
      setBusyId(null);
    }
  }

  const onAdvance = (strip: FlightStrip) =>
    withBusy(strip.id, async () => {
      const { data } = await stripsApi.advance(strip.id);
      if (data.emitted_movement) {
        flash(`Movement emitted: ${data.emitted_movement.callsign} (${data.emitted_movement.status})`);
      }
      await refetch();
    });

  const onWaypoint = async (strip: FlightStrip) => {
    const name = await dialog.prompt({ title: "Log waypoint", message: "Waypoint name (optional)", placeholder: "e.g. KADUNA", confirmText: "Log" });
    if (name === null) return;
    await withBusy(strip.id, async () => {
      await stripsApi.advance(strip.id, "O2_WAYPOINT_PASSED", name || undefined);
      await refetch();
    });
  };

  const onRemark = async (strip: FlightStrip) => {
    const text = await dialog.prompt({ title: "Add remark", placeholder: "Remark…", required: true, confirmText: "Add" });
    if (!text) return;
    await withBusy(strip.id, async () => {
      await stripsApi.remark(strip.id, text);
      await refetch();
    });
  };

  const onDivert = async (strip: FlightStrip) => {
    const reason = await dialog.prompt({
      title: "Divert / go-around",
      message: `Divert ${strip.callsign ?? "this strip"}? It will be routed to supervisor review.`,
      placeholder: "Reason", required: true, tone: "danger", confirmText: "Divert",
    });
    if (!reason) return;
    await withBusy(strip.id, async () => {
      await stripsApi.divert(strip.id, reason);
      await refetch();
    });
  };

  const onCancel = async (strip: FlightStrip) => {
    const reason = await dialog.prompt({
      title: "Cancel strip",
      message: `Cancel ${strip.callsign ?? "this strip"}? This cannot be undone.`,
      placeholder: "Reason", required: true, tone: "danger", confirmText: "Cancel strip", cancelText: "Keep",
    });
    if (!reason) return;
    await withBusy(strip.id, async () => {
      await stripsApi.cancel(strip.id, reason);
      await refetch();
    });
  };

  // --- Drag and drop: dropping on a column advances the strip into it ---
  const onDragStart = (strip: FlightStrip) => { draggingRef.current = strip; };
  const onDragEnd = () => { draggingRef.current = null; setDragOverCol(null); };

  const onDropToColumn = async (columnKey: string) => {
    if (readOnly) return;
    const strip = draggingRef.current;
    draggingRef.current = null;
    setDragOverCol(null);
    if (!strip) return;
    const steps = advancesToColumn(strip.flight_type, strip.operational_phase, columnKey);
    if (steps <= 0) {
      flash("Can't move there — strips only advance forward through their own phases.");
      return;
    }
    await withBusy(strip.id, async () => {
      let emitted = null;
      for (let i = 0; i < steps; i++) {
        const { data } = await stripsApi.advance(strip.id);
        if (data.emitted_movement) { emitted = data.emitted_movement; break; }
      }
      if (emitted) flash(`Movement emitted: ${emitted.callsign} (${emitted.status})`);
      await refetch();
    });
  };

  const cardProps = {
    readOnly,
    onAdvance, onWaypoint, onEdit: setEditStrip, onView: setViewStrip,
    onRemark, onDivert, onCancel, onDragStart, onDragEnd,
  };

  const counts = {
    dep: strips.filter((s) => s.flight_type === "departure").length,
    arr: strips.filter((s) => s.flight_type === "arrival").length,
    ovr: strips.filter((s) => s.flight_type === "overflight").length,
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Create bar — operators only */}
      {readOnly ? (
        <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
          <Eye className="w-4 h-4 text-gray-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Read-only — live operational view
          </span>
        </div>
      ) : (
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <SearchSelectBar
            flightType={flightType}
            onFlightType={setFlightType}
            onCreated={onCreated}
            onNewStrip={(callsign) => { setFormCallsign(callsign); setFormOpen(true); }}
          />
        </div>
      )}

      {!readOnly && (
        <>
          <NewStripForm
            open={formOpen}
            defaultCallsign={formCallsign}
            defaultFlightType={flightType}
            onClose={() => setFormOpen(false)}
            onCreated={onCreated}
          />
          <StripEditModal strip={editStrip} onClose={() => setEditStrip(null)} onSaved={refetch} />
        </>
      )}
      <StripDetailsModal strip={viewStrip} onClose={() => setViewStrip(null)} />

      {/* Phase columns (kanban) — drag a card to a column to the right to advance it.
          Each column scrolls vertically on its own (hidden scrollbar) so the board
          never grows taller than the viewport. */}
      <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden p-3 no-scrollbar">
        <div className="flex gap-3 h-full min-w-max">
          {BOARD_COLUMNS.map((col) => {
            const colStrips = strips.filter((s) => col.phases.includes(s.operational_phase));
            const over = dragOverCol === col.key;
            return (
              <div
                key={col.key}
                onDragOver={(e) => { e.preventDefault(); if (dragOverCol !== col.key) setDragOverCol(col.key); }}
                onDragLeave={(e) => { if (e.currentTarget === e.target) setDragOverCol(null); }}
                onDrop={(e) => { e.preventDefault(); onDropToColumn(col.key); }}
                className={`flex flex-col w-72 shrink-0 min-h-0 rounded-xl border ${
                  over ? "border-navy-400 bg-navy-50/60" : "border-gray-100 bg-gray-50/60"
                }`}
              >
                <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 shrink-0">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-navy-600">{col.title}</h3>
                  <span className="ml-auto text-xs font-bold text-gray-400 tabular-nums">{colStrips.length}</span>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-2 no-scrollbar">
                  {colStrips.length === 0 ? (
                    <p className="text-center text-xs text-gray-300 py-10 select-none">
                      {over ? "Drop to advance here" : "Empty"}
                    </p>
                  ) : (
                    colStrips.map((s) => (
                      <StripCard key={s.id} strip={s} {...cardProps} busy={busyId === s.id} />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer: live status + counters */}
      <div className="border-t border-gray-100 px-4 py-1.5 flex items-center justify-between text-[11px] text-gray-500">
        <span className="flex items-center gap-1.5">
          {live ? (
            <><Wifi className="w-3.5 h-3.5 text-emerald-500" /> Live board connected</>
          ) : (
            <><WifiOff className="w-3.5 h-3.5 text-gray-400" /> Reconnecting…</>
          )}
        </span>
        <span className="tabular-nums">
          {counts.dep} DEP · {counts.arr} ARR · {counts.ovr} OVR · {strips.length} open
        </span>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-navy-700 text-white text-sm px-4 py-2 rounded-lg shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
