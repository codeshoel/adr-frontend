import type { OperationalPhase, StripFlightType } from "@/types";

export interface PhaseMeta {
  value: OperationalPhase;
  code: string; // "D1"
  label: string; // human-readable
}

// Forward-only sequences — must mirror app/services/strip_state_machine.py.
export const DEPARTURE_PHASES: PhaseMeta[] = [
  { value: "D1_CLEARANCE_ISSUED", code: "D1", label: "Clearance Issued" },
  { value: "D2_OFF_BLOCK", code: "D2", label: "Off Block" },
  { value: "D3_TAXI_OUT", code: "D3", label: "Taxi Out" },
  { value: "D4_HOLDING_POINT", code: "D4", label: "Holding Point" },
  { value: "D5_LINEUP", code: "D5", label: "Line Up" },
  { value: "D6_TAKEOFF_CLEARED", code: "D6", label: "Take-off Cleared" },
  { value: "D7_AIRBORNE", code: "D7", label: "Airborne" },
  { value: "D8_HANDOFF_OUT", code: "D8", label: "Handoff Out" },
];

export const ARRIVAL_PHASES: PhaseMeta[] = [
  { value: "A1_HANDOFF_IN", code: "A1", label: "Handoff In" },
  { value: "A2_ESTABLISHED_FINAL", code: "A2", label: "Established Final" },
  { value: "A3_LANDING_CLEARED", code: "A3", label: "Landing Cleared" },
  { value: "A4_LANDING", code: "A4", label: "Landing" },
  { value: "A5_RUNWAY_VACATED", code: "A5", label: "Runway Vacated" },
  { value: "A6_TAXI_IN", code: "A6", label: "Taxi In" },
  { value: "A7_ON_BLOCK", code: "A7", label: "On Block" },
];

export const OVERFLIGHT_PHASES: PhaseMeta[] = [
  { value: "O1_CONTACT_IN", code: "O1", label: "Contact In" },
  { value: "O2_WAYPOINT_PASSED", code: "O2", label: "Waypoint Passed" },
  { value: "O3_CONTACT_OUT", code: "O3", label: "Contact Out" },
];

export const SEQUENCES: Record<StripFlightType, PhaseMeta[]> = {
  departure: DEPARTURE_PHASES,
  arrival: ARRIVAL_PHASES,
  overflight: OVERFLIGHT_PHASES,
};

const META_BY_VALUE: Record<string, PhaseMeta> = Object.fromEntries(
  [...DEPARTURE_PHASES, ...ARRIVAL_PHASES, ...OVERFLIGHT_PHASES].map((m) => [m.value, m])
);

export function phaseMeta(phase: OperationalPhase): PhaseMeta {
  return META_BY_VALUE[phase];
}

export function sequenceFor(flightType: StripFlightType): PhaseMeta[] {
  return SEQUENCES[flightType];
}

export function phaseIndex(flightType: StripFlightType, phase: OperationalPhase): number {
  return sequenceFor(flightType).findIndex((m) => m.value === phase);
}

export function isTerminal(flightType: StripFlightType, phase: OperationalPhase): boolean {
  const seq = sequenceFor(flightType);
  return seq[seq.length - 1].value === phase;
}

/** The single legal next phase, or null if already terminal. */
export function nextPhase(flightType: StripFlightType, phase: OperationalPhase): PhaseMeta | null {
  const seq = sequenceFor(flightType);
  const idx = seq.findIndex((m) => m.value === phase);
  if (idx < 0 || idx === seq.length - 1) return null;
  return seq[idx + 1];
}

/** Progress as "D3/8" for compact display. */
export function phaseProgress(flightType: StripFlightType, phase: OperationalPhase): string {
  const seq = sequenceFor(flightType);
  const idx = phaseIndex(flightType, phase);
  return `${idx + 1}/${seq.length}`;
}
