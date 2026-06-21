"use client";
import { useEffect, useState } from "react";
import { AlertOctagon, AlertTriangle, AlertCircle, ShieldCheck } from "lucide-react";
import client from "@/lib/api/client";
import { AerodromeCombobox } from "@/components/shared/AerodromeCombobox";
import type { Aerodrome } from "@/types";

type Severity = "critical" | "error" | "warning";

const SEV: Record<Severity, { label: string; bar: string; chip: string; icon: typeof AlertTriangle }> = {
  critical: { label: "Critical", bar: "bg-red-500", chip: "bg-red-100 text-red-700", icon: AlertOctagon },
  error: { label: "Error", bar: "bg-rose-500", chip: "bg-rose-100 text-rose-700", icon: AlertTriangle },
  warning: { label: "Warning", bar: "bg-amber-500", chip: "bg-amber-100 text-amber-700", icon: AlertCircle },
};

const humanizeCode = (code: string) =>
  code.toLowerCase().replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

interface SafetyFlag {
  movement_id: string;
  callsign: string;
  severity: Severity;
  flag_code: string;
  flag_message: string;
  movement_date: string;
}

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

      {tab === "safety" && (() => {
        const flags = feed as SafetyFlag[];
        const counts = {
          critical: flags.filter((f) => f.severity === "critical").length,
          error: flags.filter((f) => f.severity === "error").length,
          warning: flags.filter((f) => f.severity === "warning").length,
        };
        return (
          <div className="space-y-4">
            {/* Summary header */}
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700">Live Safety Feed — Flagged Movements</h2>
              <div className="flex items-center gap-2">
                {(["critical", "error", "warning"] as Severity[]).map((s) => (
                  <span key={s} className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md ${SEV[s].chip}`}>
                    {counts[s]} {SEV[s].label}
                  </span>
                ))}
              </div>
            </div>

            {flags.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <p className="mt-3 text-sm font-semibold text-gray-700">All clear</p>
                <p className="text-xs text-gray-400">No flagged movements right now.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {flags.map((item, i) => {
                  const cfg = SEV[item.severity] ?? SEV.warning;
                  const Icon = cfg.icon;
                  return (
                    <div key={i} className="flex bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
                      <div className={`w-1.5 ${cfg.bar}`} />
                      <div className="flex-1 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0 flex-wrap">
                            <Icon className={`w-4 h-4 ${cfg.chip.split(" ")[1]}`} />
                            <span className="font-mono text-base font-bold text-navy-700">{item.callsign}</span>
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${cfg.chip}`}>
                              {cfg.label}
                            </span>
                            <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                              {humanizeCode(item.flag_code)}
                            </span>
                          </div>
                          <span className="shrink-0 text-xs text-gray-400 tabular-nums">{item.movement_date}</span>
                        </div>
                        <p className="mt-1.5 text-sm text-gray-600">{item.flag_message}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

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
