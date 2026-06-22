"use client";
import { useEffect, useState } from "react";
import { reportsApi } from "@/lib/api/reports";
import { useReportJob } from "@/hooks/useReportJob";
import { formatDateTime } from "@/lib/utils";
import { AerodromeCombobox } from "@/components/shared/AerodromeCombobox";
import { useDialog } from "@/components/ui/DialogProvider";
import type { Aerodrome, ReportOutput } from "@/types";

const REPORT_TYPES = [
  { value: "daily_movement", label: "Daily Movement Summary" },
  { value: "weekly_summary", label: "Weekly Summary" },
  { value: "monthly_stats", label: "Monthly Statistics" },
  { value: "faan_billing", label: "FAAN Billing Report" },
  { value: "ncaa_compliance", label: "NCAA Compliance Report" },
  { value: "safety_summary", label: "Safety Summary" },
  { value: "airline_reconciliation", label: "Airline Reconciliation" },
] as const;

export default function ReportsPage() {
  const dialog = useDialog();
  const [tab, setTab] = useState<"generate" | "history" | "scheduled">("generate");
  const [history, setHistory] = useState<ReportOutput[]>([]);
  const { output, status, isPolling, error, trigger, reset } = useReportJob();

  const handleDownload = (id: string) =>
    reportsApi.download(id).catch(() =>
      dialog.alert({ title: "Download failed", message: "Could not download the report. Please try again.", tone: "danger" })
    );

  const [form, setForm] = useState({
    report_type: "daily_movement" as typeof REPORT_TYPES[number]["value"],
    format: "excel" as "excel" | "pdf" | "csv",
    date_from: "",
    date_to: "",
  });
  const [aerodrome, setAerodrome] = useState<Aerodrome | null>(null);

  useEffect(() => {
    if (tab === "history") {
      reportsApi.list().then(({ data }) => setHistory(data)).catch(() => {});
    }
  }, [tab]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    reset();
    trigger({ ...form, aerodrome_id: aerodrome?.id } as Parameters<typeof trigger>[0]);
  }

  const statusColors: Record<string, string> = {
    pending: "text-gray-500",
    processing: "text-blue-500",
    completed: "text-green-600",
    failed: "text-red-600",
  };

  return (
    <div className="p-6">
      <div className="flex gap-2 mb-6">
        {(["generate", "history", "scheduled"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? "bg-navy-500 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === "generate" && (
        <div className="max-w-lg">
          <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700">Generate Report</h3>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Report Type</label>
              <select
                value={form.report_type}
                onChange={(e) => setForm({ ...form, report_type: e.target.value as typeof form.report_type })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
              >
                {REPORT_TYPES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
                <input
                  type="date"
                  value={form.date_from}
                  onChange={(e) => setForm({ ...form, date_from: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
                <input
                  type="date"
                  value={form.date_to}
                  onChange={(e) => setForm({ ...form, date_to: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Aerodrome <span className="text-gray-400 font-normal">(optional — leave empty for national)</span>
              </label>
              <AerodromeCombobox value={aerodrome} onChange={setAerodrome} placeholder="All aerodromes (national)" />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Format</label>
              <div className="flex gap-2">
                {(["excel", "pdf", "csv"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setForm({ ...form, format: f })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${form.format === f ? "bg-navy-500 text-white border-navy-500" : "bg-white text-gray-600 border-gray-200"}`}
                  >
                    {f.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isPolling}
              className="w-full bg-navy-500 hover:bg-navy-600 disabled:bg-navy-300 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
            >
              {isPolling ? "Generating…" : "Generate Report"}
            </button>
          </form>

          {/* Status feedback */}
          {(output || error) && (
            <div className="mt-4 bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              {error && <p className="text-red-600 text-sm">{error}</p>}
              {output && (
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Report Status</span>
                    <span className={`text-sm font-semibold ${statusColors[output.status]}`}>
                      {output.status.charAt(0).toUpperCase() + output.status.slice(1)}
                      {isPolling && " …"}
                    </span>
                  </div>
                  {output.status === "completed" && output.file_path && (
                    <button
                      onClick={() => handleDownload(output.id)}
                      className="mt-3 inline-block bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
                    >
                      Download Report
                    </button>
                  )}
                  {output.status === "failed" && (
                    <p className="text-red-500 text-xs mt-2">{output.error_message}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === "history" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs text-gray-500">
                <th className="px-4 py-3">Type</th>
                <th>Format</th>
                <th>Status</th>
                <th>Size</th>
                <th>Generated</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {history.map((r) => (
                <tr key={r.id} className="border-t border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs font-medium">{r.report_type.replace(/_/g, " ")}</td>
                  <td className="uppercase text-xs font-mono">{r.format}</td>
                  <td>
                    <span className={`text-xs font-medium ${statusColors[r.status]}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="text-xs text-gray-500">
                    {r.file_size_bytes ? `${Math.round(r.file_size_bytes / 1024)} KB` : "—"}
                  </td>
                  <td className="text-xs text-gray-500">{formatDateTime(r.created_at)}</td>
                  <td>
                    {r.status === "completed" && (
                      <button
                        onClick={() => handleDownload(r.id)}
                        className="text-navy-500 text-xs font-medium hover:underline"
                      >
                        Download
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr><td colSpan={6} className="text-center text-gray-400 py-8">No reports generated yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "scheduled" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <p className="text-sm text-gray-500">Scheduled reports are configured by system administrators. Contact your admin to set up automated delivery.</p>
        </div>
      )}
    </div>
  );
}
