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

  listScheduled: () => client.get("/reports/scheduled/"),

  createScheduled: (data: unknown) => client.post("/reports/scheduled/", data),

  updateScheduled: (id: string, data: unknown) => client.put(`/reports/scheduled/${id}`, data),

  deleteScheduled: (id: string) => client.delete(`/reports/scheduled/${id}`),
};
