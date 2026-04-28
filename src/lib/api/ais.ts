import client from "./client";

export interface AISFlight {
  id: string;
  callsign: string;
  movement_date: string;
  ais_eobt: string | null;
  ais_aircraft_type_code: string | null;
  origin_icao: string | null;
  destination_icao: string | null;
  status: string;
}

export const aisApi = {
  list: (params?: { aerodrome_id?: string; movement_date?: string }) =>
    client.get<AISFlight[]>("/ais/flights", { params }),

  confirm: (movementId: string) =>
    client.post<{ id: string; is_ais_confirmed: boolean }>(`/ais/flights/${movementId}/confirm`),
};
