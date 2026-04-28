import client from "./client";
import type { Aerodrome } from "@/types";

export const aerodromesApi = {
  list: (search?: string, isActive?: boolean) =>
    client.get<Aerodrome[]>("/aerodromes/", { params: { search, is_active: isActive } }),

  get: (id: string) => client.get<Aerodrome>(`/aerodromes/${id}`),
};
