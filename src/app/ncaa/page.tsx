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

interface AuditLog {
  id: string;
  user_id: string | null;
  user_name: string | null;
  entity_type: string;
  entity_id: string | null;
  action: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  timestamp: string;
}

const AUDIT_ACTIONS = ["create", "update", "delete", "approve", "reject", "flag", "login", "logout", "export", "view"];
const AUDIT_ENTITIES = ["flight_movement", "flight_strip", "daily_operations_plan", "shift", "user"];

const ACTION_STYLE: Record<string, string> = {
  create: "bg-emerald-100 text-emerald-700",
  update: "bg-sky-100 text-sky-700",
  delete: "bg-red-100 text-red-700",
  approve: "bg-green-100 text-green-700",
  reject: "bg-red-100 text-red-700",
  flag: "bg-amber-100 text-amber-800",
  login: "bg-gray-100 text-gray-600",
  logout: "bg-gray-100 text-gray-600",
  export: "bg-purple-100 text-purple-700",
  view: "bg-gray-100 text-gray-500",
};

const prettyEntity = (e: string) => e.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function summarize(row: AuditLog): string {
  const v = row.new_values ?? row.old_values;
  if (!v || typeof v !== "object") return "—";
  return Object.entries(v)
    .slice(0, 3)
    .map(([k, val]) => `${k}: ${val ?? "—"}`)
    .join(" · ");
}

export default function NcaaPage() {
  const [tab, setTab] = useState<"safety" | "compliance" | "audit">("safety");
  const [feed, setFeed] = useState<unknown[]>([]);
  const [compliance, setCompliance] = useState<Record<string, unknown> | null>(null);
  const [aerodrome, setAerodrome] = useState<Aerodrome | null>(null);

  // Audit trail
  const [audit, setAudit] = useState<{ items: AuditLog[]; total: number; page: number; page_size: number }>(
    { items: [], total: 0, page: 1, page_size: 25 }
  );
  const [auditAction, setAuditAction] = useState("");
  const [auditEntity, setAuditEntity] = useState("");
  const [auditFrom, setAuditFrom] = useState("");
  const [auditTo, setAuditTo] = useState("");
  const [auditPage, setAuditPage] = useState(1);
  const [auditLoading, setAuditLoading] = useState(false);

  useEffect(() => {
    const params = aerodrome ? { aerodrome_id: aerodrome.id } : {};
    if (tab === "safety") {
      client.get("/ncaa/safety-feed", { params }).then(({ data }) => setFeed(data)).catch(() => {});
    } else if (tab === "compliance") {
      client.get("/ncaa/compliance-report", { params }).then(({ data }) => setCompliance(data)).catch(() => {});
    }
  }, [tab, aerodrome]);

  useEffect(() => {
    if (tab !== "audit") return;
    setAuditLoading(true);
    client
      .get("/audit/", {
        params: {
          action: auditAction || undefined,
          entity_type: auditEntity || undefined,
          date_from: auditFrom || undefined,
          date_to: auditTo || undefined,
          aerodrome_id: aerodrome?.id || undefined,
          page: auditPage,
          page_size: 25,
        },
      })
      .then(({ data }) => setAudit(data))
      .catch(() => setAudit({ items: [], total: 0, page: 1, page_size: 25 }))
      .finally(() => setAuditLoading(false));
  }, [tab, auditAction, auditEntity, auditFrom, auditTo, aerodrome, auditPage]);

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
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-end gap-3 bg-white border border-gray-100 rounded-xl shadow-sm p-3">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-wider text-gray-400">Action</span>
              <select value={auditAction} onChange={(e) => { setAuditAction(e.target.value); setAuditPage(1); }}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
                <option value="">All actions</option>
                {AUDIT_ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-wider text-gray-400">Entity</span>
              <select value={auditEntity} onChange={(e) => { setAuditEntity(e.target.value); setAuditPage(1); }}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
                <option value="">All entities</option>
                {AUDIT_ENTITIES.map((e) => <option key={e} value={e}>{prettyEntity(e)}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-wider text-gray-400">From</span>
              <input type="date" value={auditFrom} onChange={(e) => { setAuditFrom(e.target.value); setAuditPage(1); }}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-wider text-gray-400">To</span>
              <input type="date" value={auditTo} onChange={(e) => { setAuditTo(e.target.value); setAuditPage(1); }}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </label>
            {(auditAction || auditEntity || auditFrom || auditTo) && (
              <button onClick={() => { setAuditAction(""); setAuditEntity(""); setAuditFrom(""); setAuditTo(""); setAuditPage(1); }}
                className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700">Clear</button>
            )}
            <span className="ml-auto text-xs text-gray-400 self-center">{audit.total} record{audit.total === 1 ? "" : "s"}</span>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-gray-400 border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-2.5">Time (UTC)</th>
                  <th className="px-4 py-2.5">Actor</th>
                  <th className="px-4 py-2.5">Action</th>
                  <th className="px-4 py-2.5">Entity</th>
                  <th className="px-4 py-2.5">Details</th>
                  <th className="px-4 py-2.5">IP</th>
                </tr>
              </thead>
              <tbody>
                {auditLoading && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>
                )}
                {!auditLoading && audit.items.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No audit records for these filters.</td></tr>
                )}
                {!auditLoading && audit.items.map((row) => (
                  <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-2.5 whitespace-nowrap text-gray-600 tabular-nums">
                      {new Date(row.timestamp).toLocaleString(undefined, { hour12: false })}
                    </td>
                    <td className="px-4 py-2.5 text-gray-700">{row.user_name ?? <span className="text-gray-400">system</span>}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${ACTION_STYLE[row.action] ?? "bg-gray-100 text-gray-600"}`}>
                        {row.action}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-gray-700">{prettyEntity(row.entity_type)}</span>
                      {row.entity_id && <span className="ml-1 font-mono text-[11px] text-gray-400">#{row.entity_id.slice(0, 8)}</span>}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 max-w-md truncate" title={summarize(row)}>{summarize(row)}</td>
                    <td className="px-4 py-2.5 font-mono text-[11px] text-gray-400">{row.ip_address ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {audit.total > audit.page_size && (
            <div className="flex items-center justify-end gap-3 text-sm">
              <button disabled={auditPage <= 1} onClick={() => setAuditPage((p) => p - 1)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">Prev</button>
              <span className="text-gray-500">Page {audit.page} of {Math.max(1, Math.ceil(audit.total / audit.page_size))}</span>
              <button disabled={auditPage >= Math.ceil(audit.total / audit.page_size)} onClick={() => setAuditPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">Next</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
