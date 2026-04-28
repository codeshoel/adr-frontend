"use client";
import { useEffect, useState } from "react";
import { movementsApi } from "@/lib/api/movements";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { MovementDetailModal } from "@/components/movements/MovementDetailModal";
import { formatDate } from "@/lib/utils";
import { FLIGHT_TYPE_LABELS } from "@/lib/constants";
import type { Movement } from "@/types";

export default function AirlinesPage() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedMovementId, setSelectedMovementId] = useState<string | null>(null);

  useEffect(() => {
    movementsApi.list({ page: 1, page_size: 100 })
      .then(({ data }) => { setMovements(data.items); setTotal(data.total); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">My Movements</h2>
          <p className="text-sm text-gray-500">{total} total movements</p>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs text-gray-500">
                <th className="px-4 py-3">Callsign</th>
                <th>Type</th>
                <th>Date</th>
                <th>Origin</th>
                <th>Destination</th>
                <th>Registration</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr
                  key={m.id}
                  onClick={() => setSelectedMovementId(m.id)}
                  className="border-t border-gray-50 hover:bg-navy-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-mono font-semibold text-navy-700">{m.callsign}</td>
                  <td><span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{FLIGHT_TYPE_LABELS[m.flight_type]}</span></td>
                  <td className="text-gray-500">{formatDate(m.movement_date)}</td>
                  <td className="font-mono">{m.origin_icao ?? "—"}</td>
                  <td className="font-mono">{m.destination_icao ?? "—"}</td>
                  <td>{m.registration ?? "—"}</td>
                  <td><StatusBadge status={m.status} /></td>
                </tr>
              ))}
              {movements.length === 0 && (
                <tr><td colSpan={7} className="text-center text-gray-400 py-8">No movements found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <MovementDetailModal
        movementId={selectedMovementId}
        onClose={() => setSelectedMovementId(null)}
      />
    </div>
  );
}
