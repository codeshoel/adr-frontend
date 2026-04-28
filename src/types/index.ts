// ==================== AUTH & USERS ====================

export type UserRole =
  | "atc_operator"
  | "supervisor"
  | "nama_management"
  | "ncaa_officer"
  | "faan_officer"
  | "airline_user"
  | "executive"
  | "system_admin";

export interface User {
  id: string;
  email: string;
  username: string;
  full_name: string;
  role: UserRole;
  aerodrome_id: string | null;
  airline_id: string | null;
  phone: string | null;
  is_active: boolean;
  is_verified: boolean;
  last_login: string | null;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

// ==================== AERODROMES ====================

export interface Runway {
  id: string;
  aerodrome_id: string;
  designator: string;
  length_m: number | null;
  width_m: number | null;
  surface_type: string | null;
  is_active: boolean;
}

export interface Aerodrome {
  id: string;
  icao_code: string;
  iata_code: string | null;
  name: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  elevation_ft: number | null;
  is_active: boolean;
  runways: Runway[];
}

export interface AerodromeBasic {
  id: string;
  icao_code: string;
  iata_code: string | null;
  name: string;
  city: string;
  state: string;
}

// ==================== AIRLINES ====================

export interface Airline {
  id: string;
  icao_code: string;
  iata_code: string | null;
  name: string;
  country: string;
  is_domestic: boolean;
  is_active: boolean;
}

// ==================== AIRCRAFT ====================

export interface AircraftType {
  id: string;
  icao_designator: string;
  iata_designator: string | null;
  manufacturer: string;
  model: string;
  wake_turbulence_category: "L" | "M" | "H" | "J";
  engine_type: "JET" | "PROP" | "TURBO";
  max_pax: number | null;
  mtow_kg: number | null;
}

// ==================== MOVEMENTS ====================

export type FlightType = "arrival" | "departure" | "overflight" | "transit";
export type FlightRule = "IFR" | "VFR" | "DVFR" | "SVFR";
export type MovementStatus =
  | "draft"
  | "submitted"
  | "flagged"
  | "under_review"
  | "approved"
  | "rejected";
export type FlagSeverity = "warning" | "error" | "critical";

export interface ValidationFlag {
  id: string;
  flag_code: string;
  flag_message: string;
  severity: FlagSeverity;
  field_name: string | null;
  is_resolved: boolean;
}

export interface UserBasic {
  id: string;
  username: string;
  full_name: string;
  role: UserRole;
}

export interface AirlineBasic {
  id: string;
  icao_code: string;
  iata_code: string | null;
  name: string;
}

export interface AircraftTypeBasic {
  id: string;
  icao_designator: string;
  manufacturer: string;
  model: string;
  wake_turbulence_category: string;
}

export interface Movement {
  id: string;
  aerodrome_id: string;
  shift_id: string | null;
  entered_by_id: string;
  approved_by_id: string | null;
  callsign: string;
  flight_number: string | null;
  flight_type: FlightType;
  flight_rule: FlightRule;
  airline_id: string | null;
  aircraft_type_id: string | null;
  registration: string | null;
  origin_icao: string | null;
  destination_icao: string | null;
  movement_date: string;
  ais_eobt: string | null;
  ais_eibt: string | null;
  ais_aircraft_type_code: string | null;
  atd: string | null;
  ata: string | null;
  aobt: string | null;
  aibt: string | null;
  atot: string | null;
  aldt: string | null;
  taxi_out_minutes: number | null;
  taxi_in_minutes: number | null;
  souls_on_board: number | null;
  fuel_on_board_kg: number | null;
  cargo_kg: number | null;
  status: MovementStatus;
  is_ais_confirmed: boolean;
  has_discrepancy: boolean;
  atc_remarks: string | null;
  supervisor_remarks: string | null;
  is_billed: boolean;
  billing_reference: string | null;
  created_at: string;
  updated_at: string | null;
  aerodrome: AerodromeBasic | null;
  entered_by: UserBasic | null;
  approved_by: UserBasic | null;
  airline: AirlineBasic | null;
  aircraft_type: AircraftTypeBasic | null;
  validation_flags: ValidationFlag[];
}

export interface MovementHistoryEntry {
  id: string;
  action: string;
  user_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  timestamp: string;
}

export interface MovementCreate {
  callsign: string;
  flight_type: FlightType;
  flight_rule: FlightRule;
  movement_date: string;
  airline_id?: string;
  aircraft_type_id?: string;
  registration?: string;
  origin_icao?: string;
  destination_icao?: string;
  runway_id?: string;
  flight_number?: string;
  atd?: string;
  ata?: string;
  aobt?: string;
  aibt?: string;
  atot?: string;
  aldt?: string;
  taxi_out_minutes?: number;
  taxi_in_minutes?: number;
  souls_on_board?: number;
  fuel_on_board_kg?: number;
  cargo_kg?: number;
  atc_remarks?: string;
  shift_id?: string;
}

export interface MovementListResponse {
  items: Movement[];
  total: number;
  page: number;
  page_size: number;
}

export interface MovementFilters {
  aerodrome_id?: string;
  date_from?: string;
  date_to?: string;
  status?: MovementStatus;
  flight_type?: FlightType;
  airline_id?: string;
  callsign?: string;
  page?: number;
  page_size?: number;
}

// ==================== SHIFTS ====================

export type ShiftType = "morning" | "afternoon" | "night";

export interface Shift {
  id: string;
  shift_type: ShiftType;
  aerodrome_id: string;
  controller_id: string;
  supervisor_id: string | null;
  start_time: string;
  end_time: string | null;
  is_active: boolean;
  notes: string | null;
  aerodrome?: AerodromeBasic | null;
  controller?: UserBasic | null;
}

// ==================== DASHBOARD ====================

export interface MovementSummary {
  total_movements: number;
  arrivals: number;
  departures: number;
  overflights: number;
  transits: number;
  pending_review: number;
  flagged: number;
  approved: number;
  rejected: number;
}

export interface DailyMovementCount {
  movement_date: string;
  total: number;
  arrivals: number;
  departures: number;
}

export interface AerodromeMovementStats {
  aerodrome_id: string;
  icao_code: string;
  name: string;
  total: number;
  arrivals: number;
  departures: number;
}

export interface NationalDashboard {
  period_from: string;
  period_to: string;
  summary: MovementSummary;
  by_aerodrome: AerodromeMovementStats[];
  by_airline: { airline_id: string | null; airline_name: string | null; total: number }[];
  daily_trend: DailyMovementCount[];
}

// ==================== REPORTS ====================

export type ReportType =
  | "daily_movement"
  | "weekly_summary"
  | "monthly_stats"
  | "airline_reconciliation"
  | "faan_billing"
  | "ncaa_compliance"
  | "safety_summary"
  | "overflight";

export type ReportFormat = "pdf" | "excel" | "csv" | "json";
export type ReportStatus = "pending" | "processing" | "completed" | "failed";

export interface ReportOutput {
  id: string;
  report_type: ReportType;
  format: ReportFormat;
  file_path: string | null;
  file_size_bytes: number | null;
  parameters: Record<string, unknown>;
  status: ReportStatus;
  error_message: string | null;
  celery_task_id: string | null;
  created_at: string;
}

// ==================== NOTIFICATIONS ====================

export interface Notification {
  id: string;
  title: string;
  body: string;
  channel: "email" | "in_app" | "webhook";
  event_type: string;
  entity_id: string | null;
  is_read: boolean;
  is_sent: boolean;
  sent_at: string | null;
  created_at: string;
}

// ==================== PAGINATION ====================

export interface PaginationParams {
  page: number;
  page_size: number;
}
