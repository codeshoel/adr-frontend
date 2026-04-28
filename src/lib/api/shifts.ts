import client from "./client";
import type { Shift, ShiftType } from "@/types";

export interface ShiftStartPayload {
  shift_type: ShiftType;
  aerodrome_id: string;
  supervisor_id?: string;
  notes?: string;
}

export interface ShiftEndPayload {
  notes?: string;
}

export const shiftsApi = {
  start: (data: ShiftStartPayload) => client.post<Shift>("/shifts/start", data),

  end: (data: ShiftEndPayload = {}) => client.post<Shift>("/shifts/end", data),

  getActive: () => client.get<Shift | null>("/shifts/active"),

  list: (params?: { aerodrome_id?: string; controller_id?: string; page?: number; page_size?: number }) =>
    client.get<Shift[]>("/shifts/", { params }),
};
