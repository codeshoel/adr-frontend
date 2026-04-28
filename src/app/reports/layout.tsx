"use client";
import { Sidebar } from "@/components/shared/Sidebar";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { AuthLoading } from "@/components/shared/AuthLoading";
import { useRequireAuth } from "@/hooks/useRequireAuth";

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  const { ready, initializing, user } = useRequireAuth([
    "nama_management", "ncaa_officer", "faan_officer", "executive", "system_admin",
  ]);
  if (initializing) return <AuthLoading />;
  if (!ready || !user) return null;
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-800">Reports</h1>
          <div className="flex items-center gap-3"><NotificationBell /><span className="text-sm text-gray-500">{user.full_name}</span></div>
        </header>
        <main className="flex-1 bg-gray-50 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
