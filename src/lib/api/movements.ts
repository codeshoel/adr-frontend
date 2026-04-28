import client from "./client";
import type { Movement, MovementCreate, MovementFilters, MovementListResponse, ValidationFlag } from "@/types";

export const movementsApi = {
  list: (params: MovementFilters) =>
    client.get<MovementListResponse>("/movements/", { params }),

  get: (id: string) => client.get<Movement>(`/movements/${id}`),

  create: (data: MovementCreate) => client.post<Movement>("/movements/", data),

  update: (id: string, data: Partial<MovementCreate>) =>
    client.put<Movement>(`/movements/${id}`, data),

  delete: (id: string) => client.delete(`/movements/${id}`),

  submit: (id: string) => client.post<Movement>(`/movements/${id}/submit`),

  validate: (id: string) =>
    client.post<ValidationFlag[]>(`/movements/${id}/validate`),

  approve: (id: string, decision: "approve" | "reject", supervisor_remarks: string) =>
    client.post<Movement>(`/movements/${id}/approve`, { decision, supervisor_remarks }),

  history: (id: string) => client.get(`/movements/${id}/history`),

  export: (params: MovementFilters) =>
    client.get("/movements/export", { params, responseType: "blob" }),
};
