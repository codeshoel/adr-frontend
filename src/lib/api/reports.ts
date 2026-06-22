import client from "./client";
import type { ReportFormat, ReportOutput, ReportType } from "@/types";

export const reportsApi = {
  list: () => client.get<ReportOutput[]>("/reports/"),

  generate: (params: {
    report_type: ReportType;
    format: ReportFormat;
    date_from?: string;
    date_to?: string;
    aerodrome_id?: string;
  }) => client.post<ReportOutput>("/reports/generate", params),

  get: (id: string) => client.get<ReportOutput>(`/reports/${id}`),

  downloadUrl: (id: string) =>
    `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1"}/reports/${id}/download`,

  // Download through the authenticated client (sends the Bearer token), then
  // trigger a browser save. A plain link/navigation can't carry the token → 401.
  download: async (id: string, fallbackName?: string) => {
    const res = await client.get(`/reports/${id}/download`, { responseType: "blob" });
    const disposition = String(res.headers?.["content-disposition"] ?? "");
    const match = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
    const filename = (match?.[1] && decodeURIComponent(match[1])) || fallbackName || `report-${id}`;

    const blobUrl = URL.createObjectURL(res.data as Blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(blobUrl);
  },

  listScheduled: () => client.get("/reports/scheduled/"),

  createScheduled: (data: unknown) => client.post("/reports/scheduled/", data),

  updateScheduled: (id: string, data: unknown) => client.put(`/reports/scheduled/${id}`, data),

  deleteScheduled: (id: string) => client.delete(`/reports/scheduled/${id}`),
};
