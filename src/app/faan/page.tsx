"use client";
import { useEffect, useState } from "react";
import client from "@/lib/api/client";
import { AerodromeCombobox } from "@/components/shared/AerodromeCombobox";
import { MovementDetailModal } from "@/components/movements/MovementDetailModal";
import type { Aerodrome } from "@/types";

interface BillingSummary {
  period_from: string;
  period_to: string;
  total_billable: number;
  billed: number;
  unbilled: number;
  by_aerodrome: Array<{ icao_code: string; name: string; total: number; billed: number }>;
}

export default function FaanPage() {
  const [tab, setTab] = useState<"billing" | "movements" | "exports">("billing");
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [movements, setMovements] = useState<unknown[]>([]);
  const [aerodrome, setAerodrome] = useState<Aerodrome | null>(null);
  const [selectedMovementId, setSelectedMovementId] = useState<string | null>(null);

  useEffect(() => {
    const params = aerodrome ? { aerodrome_id: aerodrome.id } : {};
    client.get("/faan/billing-summary", { params }).then(({ data }) => setSummary(data)).catch(() => {});
  }, [aerodrome]);

  useEffect(() => {
    if (tab === "movements") {
      const params = aerodrome ? { aerodrome_id: aerodrome.id, page_size: 50 } : { page_size: 50 };
      client.get("/faan/movements", { params }).then(({ data }) => setMovements(data.items)).catch(() => {});
    }
  }, [tab, aerodrome]);

  async function handleExport() {
    try {
      const { data } = await client.post("/faan/export-billing");
      alert(`Export queued. Report ID: ${data.report_output_id}`);
    } catch {
      alert("Export failed");
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between gap-2 mb-6">
        <div className="flex gap-2">
          {(["billing", "movements", "exports"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? "bg-navy-500 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <div className="w-72">
          <AerodromeCombobox
            value={aerodrome}
            onChange={setAerodrome}
            placeholder="All aerodromes"
          />
        </div>
      </div>

      {tab === "billing" && summary && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Total Billable", value: summary.total_billable, color: "text-navy-500" },
              { label: "Billed", value: summary.billed, color: "text-green-600" },
              { label: "Unbilled", value: summary.unbilled, color: "text-amber-600" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white border border-gray-100 rounded-xl p-4 text-center shadow-sm">
                <p className="text-xs text-gray-500">{label}</p>
                <p className={`text-3xl font-bold mt-1 ${color}`}>{value.toLocaleString()}</p>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">By Aerodrome</h3>
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-gray-500 border-b"><th className="pb-2">ICAO</th><th>Name</th><th>Total</th><th>Billed</th><th>Unbilled</th></tr></thead>
              <tbody>
                {summary.by_aerodrome.map((a) => (
                  <tr key={a.icao_code} className="border-b border-gray-50">
                    <td className="py-2 font-mono font-semibold">{a.icao_code}</td>
                    <td className="text-gray-600">{a.name}</td>
                    <td>{a.total}</td>
                    <td className="text-green-600">{a.billed}</td>
                    <td className="text-amber-600">{a.total - a.billed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "movements" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr className="text-left text-xs text-gray-500"><th className="px-4 py-3">Callsign</th><th>Type</th><th>Date</th><th>Registration</th><th>Billed</th></tr></thead>
            <tbody>
              {(movements as Array<{id: string; callsign: string; flight_type: string; movement_date: string; registration: string; is_billed: boolean}>).map((m) => (
                <tr
                  key={m.id}
                  onClick={() => setSelectedMovementId(m.id)}
                  className="border-t border-gray-50 hover:bg-navy-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-mono font-semibold text-navy-700">{m.callsign}</td>
                  <td>{m.flight_type}</td>
                  <td>{m.movement_date}</td>
                  <td>{m.registration ?? "—"}</td>
                  <td>{m.is_billed ? <span className="text-green-600 text-xs font-medium">Yes</span> : <span className="text-amber-600 text-xs font-medium">No</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "exports" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Billing Export</h3>
          <p className="text-sm text-gray-500">Generate an Excel report of all billable movements for the current month.</p>
          <button
            onClick={handleExport}
            className="bg-navy-500 hover:bg-navy-600 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors"
          >
            Export Billing Report
          </button>
        </div>
      )}

      <MovementDetailModal
        movementId={selectedMovementId}
        onClose={() => setSelectedMovementId(null)}
      />
    </div>
  );
}
