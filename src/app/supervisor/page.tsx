"use client";
import { useEffect, useState } from "react";
import { ClipboardCheck, AlertTriangle } from "lucide-react";
import { movementsApi } from "@/lib/api/movements";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { MovementDetailModal } from "@/components/movements/MovementDetailModal";
import { formatDate } from "@/lib/utils";
import { FLIGHT_TYPE_LABELS } from "@/lib/constants";
import type { Movement } from "@/types";

export default function SupervisorPage() {
  const [submittedItems, setSubmittedItems] = useState<Movement[]>([]);
  const [flaggedItems, setFlaggedItems] = useState<Movement[]>([]);
  const [selectedMovementId, setSelectedMovementId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadQueue() {
    setLoading(true);
    try {
      const [submitted, flagged] = await Promise.all([
        movementsApi.list({ status: "submitted", page: 1, page_size: 100 }),
        movementsApi.list({ status: "flagged", page: 1, page_size: 100 }),
      ]);
      setSubmittedItems(submitted.data.items);
      setFlaggedItems(flagged.data.items);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadQueue(); }, []);

  return (
    <div className="p-6 space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          icon={ClipboardCheck}
          title="Pending Review"
          count={submittedItems.length}
          color="bg-blue-50 border-blue-300 text-blue-700"
        />
        <StatCard
          icon={AlertTriangle}
          title="Flagged for Review"
          count={flaggedItems.length}
          color="bg-amber-50 border-amber-300 text-amber-700"
        />
      </div>

      {/* Queue */}
      <div className="bg-white rounded-xl border-2 border-navy-500 shadow-sm overflow-hidden">
        <div className="bg-navy-500 px-5 py-3 text-white">
          <h2 className="text-sm font-bold uppercase tracking-widest">Review Queue</h2>
          <p className="text-[10px] text-navy-200 mt-0.5">
            Click a movement to view details and approve/reject
          </p>
        </div>

        {loading && <p className="text-center text-gray-400 py-8 text-sm">Loading queue…</p>}

        {!loading && submittedItems.length === 0 && flaggedItems.length === 0 && (
          <div className="text-center py-12">
            <ClipboardCheck size={32} className="text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Queue is empty — all movements reviewed</p>
          </div>
        )}

        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="text-left text-[10px] text-gray-500 uppercase tracking-widest">
              <th className="px-5 py-3">Callsign</th>
              <th>Type</th>
              <th>Date</th>
              <th>Route</th>
              <th>Aerodrome</th>
              <th>Flags</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {[...flaggedItems, ...submittedItems].map((m) => (
              <tr
                key={m.id}
                onClick={() => setSelectedMovementId(m.id)}
                className="border-t border-gray-100 hover:bg-navy-50 cursor-pointer transition-colors"
              >
                <td className="px-5 py-3 font-mono font-bold text-navy-700">{m.callsign}</td>
                <td>
                  <span className="text-[10px] bg-navy-500 text-white px-1.5 py-0.5 rounded font-bold tracking-wider">
                    {FLIGHT_TYPE_LABELS[m.flight_type]}
                  </span>
                </td>
                <td className="text-xs text-gray-600">{formatDate(m.movement_date)}</td>
                <td className="font-mono text-xs text-gray-600">
                  {m.origin_icao ?? "—"} → {m.destination_icao ?? "—"}
                </td>
                <td className="text-xs text-gray-500">
                  {m.aerodrome?.icao_code ?? "—"}
                </td>
                <td>
                  {m.validation_flags.length > 0 ? (
                    <span className="text-xs bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">
                      {m.validation_flags.length}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                <td>
                  <StatusBadge status={m.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <MovementDetailModal
        movementId={selectedMovementId}
        onClose={() => setSelectedMovementId(null)}
        onChanged={loadQueue}
      />
    </div>
  );
}

function StatCard({ icon: Icon, title, count, color }: { icon: React.ElementType; title: string; count: number; color: string }) {
  return (
    <div className={`border-l-4 rounded-xl p-5 ${color}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-widest font-bold opacity-80">{title}</p>
          <p className="text-3xl font-bold mt-1">{count}</p>
        </div>
        <Icon size={28} className="opacity-60" />
      </div>
    </div>
  );
}
