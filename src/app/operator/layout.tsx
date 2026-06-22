"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/shared/Sidebar";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { AuthLoading } from "@/components/shared/AuthLoading";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useShiftStore } from "@/store/shift.store";

const SHIFTS_PATH = "/operator/shifts";

export default function OperatorLayout({ children }: { children: React.ReactNode }) {
  const { ready, initializing, user } = useRequireAuth(["atc_operator", "system_admin"]);
  const pathname = usePathname();
  const router = useRouter();
  const { activeShift, isLoaded, loadActiveShift } = useShiftStore();

  // Once authenticated, load the operator's active shift status
  useEffect(() => {
    if (ready && user?.role === "atc_operator" && !isLoaded) {
      loadActiveShift();
    }
  }, [ready, user, isLoaded, loadActiveShift]);

  // Gate: operators without an active shift may ONLY visit /operator/shifts.
  // System admins are not gated.
  useEffect(() => {
    if (!ready || !user) return;
    if (user.role !== "atc_operator") return;
    if (!isLoaded) return;
    const onShiftsPage = pathname === SHIFTS_PATH || pathname.startsWith(SHIFTS_PATH + "/");
    if (!activeShift && !onShiftsPage) {
      router.replace(SHIFTS_PATH);
    }
  }, [ready, user, isLoaded, activeShift, pathname, router]);

  if (initializing) return <AuthLoading />;
  if (!ready || !user) return null;

  // Hold rendering until we know shift status — prevents a brief flash of the
  // flight-log page before the redirect to /operator/shifts fires.
  if (user.role === "atc_operator" && !isLoaded) return <AuthLoading />;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="bg-white border-b-2 border-navy-500 px-6 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-amber-adr rounded-sm" />
            <h1 className="text-sm font-bold text-navy-500 uppercase tracking-widest">Tower Operations · ATC</h1>
            <span className={`ml-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${
              activeShift ? "text-emerald-600" : "text-gray-400"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                activeShift ? "bg-emerald-500 animate-pulse" : "bg-gray-300"
              }`} />
              {activeShift ? "Live · On Duty" : "Off Duty"}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <div className="text-right">
              <p className="text-[10px] text-gray-400 uppercase tracking-widest">On Duty</p>
              <p className="text-xs font-bold text-navy-700">{user.full_name}</p>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
