"use client";
import { useEffect, useState } from "react";
import client from "@/lib/api/client";
import { SEVERITY_CONFIG } from "@/lib/constants";
import { AerodromeCombobox } from "@/components/shared/AerodromeCombobox";
import type { Aerodrome } from "@/types";

export default function NcaaPage() {
  const [tab, setTab] = useState<"safety" | "compliance" | "audit">("safety");
  const [feed, setFeed] = useState<unknown[]>([]);
  const [compliance, setCompliance] = useState<Record<string, unknown> | null>(null);
  const [aerodrome, setAerodrome] = useState<Aerodrome | null>(null);

  useEffect(() => {
    const params = aerodrome ? { aerodrome_id: aerodrome.id } : {};
    if (tab === "safety") {
      client.get("/ncaa/safety-feed", { params }).then(({ data }) => setFeed(data)).catch(() => {});
    } else if (tab === "compliance") {
      client.get("/ncaa/compliance-report", { params }).then(({ data }) => setCompliance(data)).catch(() => {});
    }
  }, [tab, aerodrome]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between gap-2 mb-6">
        <div className="flex gap-2">
          {(["safety", "compliance", "audit"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? "bg-navy-500 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
            >
              {t === "safety" ? "Safety Feed" : t === "compliance" ? "Compliance" : "Audit Trail"}
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

      {tab === "safety" && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Live Safety Feed — Flagged Movements</h2>
          {(feed as Array<{movement_id: string; callsign: string; severity: string; flag_code: string; flag_message: string; movement_date: string}>).map((item, i) => {
            const cfg = SEVERITY_CONFIG[item.severity as keyof typeof SEVERITY_CONFIG];
            return (
              <div key={i} className={`border rounded-lg px-4 py-3 ${cfg?.className}`}>
                <div className="flex items-center justify-between">
                  <span className="font-mono font-semibold">{item.callsign}</span>
                  <span className="text-xs">{item.movement_date}</span>
                </div>
                <p className="text-xs mt-1">[{item.flag_code}] {item.flag_message}</p>
              </div>
            );
          })}
          {feed.length === 0 && <p className="text-sm text-gray-400">No flagged movements. All clear.</p>}
        </div>
      )}

      {tab === "compliance" && compliance && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Total Movements", value: compliance.total_movements },
              { label: "Approved", value: compliance.approved_count },
              { label: "Completeness", value: `${compliance.data_completeness_percent}%` },
              { label: "Flag Resolution", value: `${compliance.flag_resolution_rate}%` },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white border border-gray-100 rounded-xl p-4 text-center shadow-sm">
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-2xl font-bold text-navy-500 mt-1">{String(value)}</p>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">By Aerodrome</h3>
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-gray-500 border-b"><th className="pb-2">ICAO</th><th>Name</th><th>Total</th><th>Approved</th><th>Flagged</th></tr></thead>
              <tbody>
                {(compliance.by_aerodrome as Array<{icao_code: string; name: string; total: number; approved: number; flagged: number}>).map((a) => (
                  <tr key={a.icao_code} className="border-b border-gray-50">
                    <td className="py-2 font-mono font-semibold">{a.icao_code}</td>
                    <td className="text-gray-600">{a.name}</td>
                    <td>{a.total}</td>
                    <td className="text-green-600">{a.approved}</td>
                    <td className="text-amber-600">{a.flagged}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "audit" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <p className="text-sm text-gray-500">Audit trail access — use the filters to query specific movement records or users.</p>
          <p className="text-xs text-gray-400 mt-2">Full audit trail available via API: <code className="bg-gray-100 px-1 rounded">/api/v1/audit/</code></p>
        </div>
      )}
    </div>
  );
}
