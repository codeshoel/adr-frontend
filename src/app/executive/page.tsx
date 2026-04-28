"use client";
import { useEffect, useState } from "react";
import { dashboardApi } from "@/lib/api/dashboard";
import { KPICard } from "@/components/dashboard/KPICard";
import { MovementTrendChart } from "@/components/dashboard/MovementTrendChart";
import { PlaneTakeoff, PlaneLanding, ShieldCheck, CheckCircle } from "lucide-react";

export default function ExecutivePage() {
  const [data, setData] = useState<Awaited<ReturnType<typeof dashboardApi.executive>>["data"] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.executive().then(({ data }) => setData(data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-full"><p className="text-gray-400">Loading dashboard…</p></div>;
  if (!data) return null;

  return (
    <div className="p-6 space-y-6">
      {/* Period */}
      <p className="text-sm text-gray-500">Period: {data.period_from} to {data.period_to}</p>

      {/* Headline KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Movements" value={data.headline_stats.total_movements} icon={PlaneTakeoff} />
        <KPICard title="Arrivals" value={data.headline_stats.arrivals} icon={PlaneLanding} />
        <KPICard title="Safety Score" value={`${data.safety_score}%`} icon={ShieldCheck} />
        <KPICard title="Compliance Rate" value={`${data.compliance_rate}%`} icon={CheckCircle} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MovementTrendChart data={data.daily_trend} />

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Top Aerodromes</h3>
          <div className="space-y-3">
            {data.top_aerodromes.map((a) => (
              <div key={a.aerodrome_id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-navy-500">{a.icao_code}</span>
                  <span className="text-xs text-gray-500">{a.name}</span>
                </div>
                <span className="text-sm font-bold">{a.total.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Airlines */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Top Airlines</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {data.top_airlines.slice(0, 10).map((a, i) => (
            <div key={i} className="border border-gray-100 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500 truncate">{a.airline_name ?? "Unknown"}</p>
              <p className="text-lg font-bold text-navy-500 mt-1">{a.total.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
