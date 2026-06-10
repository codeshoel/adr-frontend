import client, { getAccessToken } from "./client";
import type {
  FlightStrip,
  OperationalPhase,
  StripAdvanceResponse,
  StripCreate,
  SuggestResponse,
} from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export const stripsApi = {
  active: () => client.get<FlightStrip[]>("/strips/active"),

  get: (id: string) => client.get<FlightStrip>(`/strips/${id}`),

  suggest: (q: string) =>
    client.get<SuggestResponse>("/strips/suggest", { params: { q } }),

  create: (data: StripCreate) => client.post<FlightStrip>("/strips/", data),

  advance: (id: string, toPhase?: OperationalPhase, waypointName?: string) =>
    client.post<StripAdvanceResponse>(`/strips/${id}/advance`, {
      to_phase: toPhase ?? null,
      waypoint_name: waypointName ?? null,
    }),

  edit: (id: string, changes: Partial<StripCreate>) =>
    client.post<FlightStrip>(`/strips/${id}/edit`, changes),

  remark: (id: string, text: string) =>
    client.post<FlightStrip>(`/strips/${id}/remark`, { text }),

  divert: (id: string, reason: string) =>
    client.post<FlightStrip>(`/strips/${id}/divert`, { reason }),

  cancel: (id: string, reason: string) =>
    client.post<FlightStrip>(`/strips/${id}/cancel`, { reason }),
};

export interface StripEvent {
  type: string; // "snapshot" | "strip.created" | "strip.advanced" | ...
  [key: string]: unknown;
}

/**
 * Open an SSE connection to the live board. The token is passed as a query
 * param because EventSource cannot set Authorization headers. Returns the
 * EventSource so the caller can close() it on unmount.
 */
export function openStripStream(onEvent: (event: StripEvent) => void): EventSource | null {
  if (typeof window === "undefined") return null;
  const token = getAccessToken();
  if (!token) return null;

  const url = `${BASE_URL}/strips/stream?token=${encodeURIComponent(token)}`;
  const es = new EventSource(url);

  const handler = (e: MessageEvent) => {
    try {
      onEvent(JSON.parse(e.data));
    } catch {
      /* ignore malformed frame */
    }
  };

  // Backend names each event (event: strip.created\n...). Listen for the known
  // set plus the default "message" as a fallback.
  ["snapshot", "strip.created", "strip.advanced", "strip.closed", "strip.edited",
   "strip.remarked", "strip.diverted", "strip.cancelled", "update", "message"]
    .forEach((name) => es.addEventListener(name, handler as EventListener));

  return es;
}
