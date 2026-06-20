"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { PlaneTakeoff, PlaneLanding, Radio, Wifi, WifiOff } from "lucide-react";
import type { FlightStrip } from "@/types";
import { stripsApi, openStripStream } from "@/lib/api/strips";
import type { StripFlightType } from "@/types";
import { SearchSelectBar } from "./SearchSelectBar";
import { NewStripForm } from "./NewStripForm";
import { StripCard } from "./StripCard";
import { useDialog } from "@/components/ui/DialogProvider";

export function StripBoard() {
  const dialog = useDialog();
  const [strips, setStrips] = useState<FlightStrip[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [flightType, setFlightType] = useState<StripFlightType>("departure");
  const [formOpen, setFormOpen] = useState(false);
  const [formCallsign, setFormCallsign] = useState("");
  const refetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refetch = useCallback(async () => {
    try {
      const { data } = await stripsApi.active();
      setStrips(data);
    } catch {
      /* keep last known board */
    }
  }, []);

  // Debounced refetch driven by SSE events.
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
      const detail =
        (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Action failed";
      flash(detail);
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
    const name = await dialog.prompt({
      title: "Log waypoint",
      message: "Waypoint name (optional)",
      placeholder: "e.g. KADUNA",
      confirmText: "Log",
    });
    if (name === null) return;
    await withBusy(strip.id, async () => {
      await stripsApi.advance(strip.id, "O2_WAYPOINT_PASSED", name || undefined);
      await refetch();
    });
  };

  const onRemark = async (strip: FlightStrip) => {
    const text = await dialog.prompt({
      title: "Add remark",
      placeholder: "Remark…",
      required: true,
      confirmText: "Add",
    });
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
      placeholder: "Reason",
      required: true,
      tone: "danger",
      confirmText: "Divert",
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
      placeholder: "Reason",
      required: true,
      tone: "danger",
      confirmText: "Cancel strip",
      cancelText: "Keep",
    });
    if (!reason) return;
    await withBusy(strip.id, async () => {
      await stripsApi.cancel(strip.id, reason);
      await refetch();
    });
  };

  const cardProps = { onAdvance, onWaypoint, onRemark, onDivert, onCancel };

  const departures = strips.filter((s) => s.flight_type === "departure");
  const arrivals = strips.filter((s) => s.flight_type === "arrival");
  const overflights = strips.filter((s) => s.flight_type === "overflight");

  return (
    <div className="h-full flex flex-col">
      {/* Search-select bar */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
        <SearchSelectBar
          flightType={flightType}
          onFlightType={setFlightType}
          onCreated={onCreated}
          onNewStrip={(callsign) => {
            setFormCallsign(callsign);
            setFormOpen(true);
          }}
        />
      </div>

      <NewStripForm
        open={formOpen}
        defaultCallsign={formCallsign}
        defaultFlightType={flightType}
        onClose={() => setFormOpen(false)}
        onCreated={onCreated}
      />

      {/* Lanes */}
      <div className="flex-1 overflow-hidden grid grid-cols-2 gap-3 p-3">
        <Lane
          title="Departures"
          icon={PlaneTakeoff}
          accent="text-navy-600"
          count={departures.length}
          strips={departures}
          busyId={busyId}
          cardProps={cardProps}
        />
        <Lane
          title="Arrivals"
          icon={PlaneLanding}
          accent="text-sky-600"
          count={arrivals.length}
          strips={arrivals}
          busyId={busyId}
          cardProps={cardProps}
        />
      </div>

      {/* Overflight drawer */}
      {overflights.length > 0 && (
        <div className="border-t border-gray-100 p-3 max-h-48 overflow-y-auto">
          <div className="flex items-center gap-2 mb-2">
            <Radio className="w-4 h-4 text-purple-600" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-purple-600">
              Overflights · {overflights.length}
            </h3>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {overflights.map((s) => (
              <StripCard key={s.id} strip={s} {...cardProps} busy={busyId === s.id} />
            ))}
          </div>
        </div>
      )}

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
          {departures.length} DEP · {arrivals.length} ARR · {overflights.length} OVR · {strips.length} open
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

interface LaneProps {
  title: string;
  icon: typeof PlaneTakeoff;
  accent: string;
  count: number;
  strips: FlightStrip[];
  busyId: string | null;
  cardProps: Omit<Parameters<typeof StripCard>[0], "strip" | "busy">;
}

function Lane({ title, icon: Icon, accent, count, strips, busyId, cardProps }: LaneProps) {
  return (
    <div className="flex flex-col min-h-0 bg-white rounded-xl border border-gray-100">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
        <Icon className={`w-4 h-4 ${accent}`} />
        <h3 className={`text-xs font-bold uppercase tracking-widest ${accent}`}>{title}</h3>
        <span className="ml-auto text-xs font-bold text-gray-400 tabular-nums">{count}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {strips.length === 0 ? (
          <p className="text-center text-xs text-gray-300 py-8">No active strips</p>
        ) : (
          strips.map((s) => <StripCard key={s.id} strip={s} {...cardProps} busy={busyId === s.id} />)
        )}
      </div>
    </div>
  );
}
