import client from "./client";
import type { NationalDashboard } from "@/types";

export const dashboardApi = {
  national: (dateFrom?: string, dateTo?: string, aerodromeId?: string) =>
    client.get<NationalDashboard>("/dashboard/national", {
      params: { date_from: dateFrom, date_to: dateTo, aerodrome_id: aerodromeId },
    }),

  operator: () => client.get("/dashboard/operator"),

  supervisor: () => client.get("/dashboard/supervisor"),

  safety: (dateFrom?: string, dateTo?: string, aerodromeId?: string) =>
    client.get("/dashboard/safety", { params: { date_from: dateFrom, date_to: dateTo, aerodrome_id: aerodromeId } }),

  kpis: () => client.get("/dashboard/kpis"),

  executive: (dateFrom?: string, dateTo?: string) =>
    client.get("/dashboard/executive", { params: { date_from: dateFrom, date_to: dateTo } }),
};
