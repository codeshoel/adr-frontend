import type { UserRole } from "@/types";

export const ROLE_ROUTES: Record<UserRole, string> = {
  atc_operator: "/operator",
  supervisor: "/supervisor",
  nama_management: "/nama",
  ncaa_officer: "/ncaa",
  faan_officer: "/faan",
  airline_user: "/airlines",
  executive: "/executive",
  system_admin: "/admin",
};

export const ROLE_LABELS: Record<UserRole, string> = {
  atc_operator: "ATC Operator",
  supervisor: "Supervisor",
  nama_management: "NAMA Management",
  ncaa_officer: "NCAA Officer",
  faan_officer: "FAAN Officer",
  airline_user: "Airline User",
  executive: "Executive",
  system_admin: "System Admin",
};

export const STATUS_CONFIG = {
  draft: { label: "Draft", className: "bg-gray-100 text-gray-700" },
  submitted: { label: "Submitted", className: "bg-blue-100 text-blue-700" },
  flagged: { label: "Flagged", className: "bg-amber-100 text-amber-800" },
  under_review: { label: "Under Review", className: "bg-purple-100 text-purple-700" },
  approved: { label: "Approved", className: "bg-green-100 text-green-700" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-700" },
} as const;

export const SEVERITY_CONFIG = {
  warning: { label: "Warning", className: "bg-amber-50 border-amber-300 text-amber-800" },
  error: { label: "Error", className: "bg-red-50 border-red-300 text-red-800" },
  critical: { label: "Critical", className: "bg-red-100 border-red-500 text-red-900 font-semibold" },
} as const;

export const FLIGHT_TYPE_LABELS = {
  arrival: "ARR",
  departure: "DEP",
  overflight: "OVR",
  transit: "TRN",
} as const;

export const PAGE_SIZE = 50;
