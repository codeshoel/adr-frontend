"use client";
import { useEffect, useState } from "react";
import { dashboardApi } from "@/lib/api/dashboard";
import { KPICard } from "@/components/dashboard/KPICard";
import { MovementTrendChart } from "@/components/dashboard/MovementTrendChart";
import { AerodromeCombobox } from "@/components/shared/AerodromeCombobox";
import { PlaneTakeoff, PlaneLanding, AlertTriangle, CheckCircle } from "lucide-react";
import type { Aerodrome, NationalDashboard } from "@/types";

export default function NamaPage() {
  const [data, setData] = useState<NationalDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [aerodrome, setAerodrome] = useState<Aerodrome | null>(null);

  useEffect(() => {
    setLoading(true);
    dashboardApi
      .national(undefined, undefined, aerodrome?.id)
      .then(({ data }) => setData(data))
      .finally(() => setLoading(false));
  }, [aerodrome]);

  return (
    <div className="p-6 space-y-6">
      {/* Filter bar */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-navy-700">
            {aerodrome ? `${aerodrome.icao_code} — ${aerodrome.name}` : "National Overview"}
          </h2>
          <p className="text-xs text-gray-500">
            {aerodrome ? "Filtered to single aerodrome" : "All controlled aerodromes"}
          </p>
        </div>
        <div className="w-72">
          <AerodromeCombobox
            value={aerodrome}
            onChange={setAerodrome}
            placeholder="All aerodromes"
          />
        </div>
      </div>

      {loading && <p className="text-gray-400 text-sm">Loading…</p>}
      {!loading && !data && <p className="text-gray-400 text-sm">No data</p>}
      {data && (<>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Movements" value={data.summary.total_movements} icon={PlaneTakeoff} />
        <KPICard title="Arrivals" value={data.summary.arrivals} icon={PlaneLanding} />
        <KPICard title="Pending Review" value={data.summary.pending_review} icon={AlertTriangle} />
        <KPICard title="Approved" value={data.summary.approved} icon={CheckCircle} />
      </div>

      <MovementTrendChart data={data.daily_trend} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Aerodromes</h3>
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-gray-500 text-left border-b"><th className="pb-2">ICAO</th><th>Name</th><th>Total</th><th>ARR</th><th>DEP</th></tr></thead>
            <tbody>
              {data.by_aerodrome.map((a) => (
                <tr key={a.aerodrome_id} className="border-b border-gray-50">
                  <td className="py-2 font-mono text-navy-500 font-semibold">{a.icao_code}</td>
                  <td className="text-xs text-gray-600 truncate max-w-28">{a.name}</td>
                  <td className="font-medium">{a.total}</td>
                  <td className="text-blue-600">{a.arrivals}</td>
                  <td className="text-amber-600">{a.departures}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Airlines</h3>
          <div className="space-y-2">
            {data.by_airline.slice(0, 10).map((a, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-gray-600 truncate">{a.airline_name ?? "Unknown"}</span>
                <span className="font-semibold text-navy-500">{a.total}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      </>)}
    </div>
  );
}
