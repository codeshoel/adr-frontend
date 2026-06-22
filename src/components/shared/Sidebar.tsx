"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  PlaneTakeoff,
  ClipboardCheck,
  BarChart2,
  ShieldCheck,
  DollarSign,
  Plane,
  TrendingUp,
  Settings,
  LogOut,
  Bell,
  Clock,
  Radio,
  History,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";
import type { UserRole } from "@/types";
import { ROLE_LABELS } from "@/lib/constants";

interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
}

const INBOX_ITEM: NavItem = { label: "Notifications", icon: Bell, href: "/notifications" };

const NAV_ITEMS: Record<UserRole, NavItem[]> = {
  atc_operator: [
    { label: "Movements", icon: PlaneTakeoff, href: "/operator" },
    { label: "AIS Queue", icon: Radio, href: "/operator/ais" },
    { label: "History", icon: History, href: "/operator/history" },
    { label: "Shift Log", icon: Clock, href: "/operator/shifts" },
    INBOX_ITEM,
  ],
  supervisor: [
    { label: "Review Queue", icon: ClipboardCheck, href: "/supervisor" },
    INBOX_ITEM,
  ],
  nama_management: [
    { label: "Dashboard", icon: BarChart2, href: "/nama" },
    { label: "Tower Board", icon: Eye, href: "/nama/tower" },
    { label: "Reports", icon: ClipboardCheck, href: "/reports" },
    INBOX_ITEM,
  ],
  ncaa_officer: [
    { label: "Safety Feed", icon: ShieldCheck, href: "/ncaa" },
    { label: "Reports", icon: ClipboardCheck, href: "/reports" },
    INBOX_ITEM,
  ],
  faan_officer: [
    { label: "Billing", icon: DollarSign, href: "/faan" },
    { label: "Reports", icon: ClipboardCheck, href: "/reports" },
    INBOX_ITEM,
  ],
  airline_user: [
    { label: "My Movements", icon: Plane, href: "/airlines" },
    INBOX_ITEM,
  ],
  executive: [
    { label: "Overview", icon: TrendingUp, href: "/executive" },
    INBOX_ITEM,
  ],
  system_admin: [
    { label: "Dashboard", icon: BarChart2, href: "/nama" },
    { label: "Tower Board", icon: Eye, href: "/nama/tower" },
    { label: "Users", icon: Settings, href: "/admin" },
    { label: "Reports", icon: ClipboardCheck, href: "/reports" },
    INBOX_ITEM,
  ],
};

export function Sidebar() {
  const { user, logout } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();

  if (!user) return null;

  const navItems = NAV_ITEMS[user.role] ?? [];

  async function handleLogout() {
    await logout();
    router.replace("/auth/login");
  }

  return (
    <aside className="w-64 shrink-0 min-h-screen bg-navy-500 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-navy-400">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-amber-adr rounded flex items-center justify-center">
            <span className="text-navy-500 font-bold text-xs">ADR</span>
          </div>
          <div>
            <p className="text-white font-semibold text-sm">ADR Platform</p>
            <p className="text-navy-200 text-xs">NAMA</p>
          </div>
        </div>
      </div>

      {/* User info */}
      <div className="px-4 py-3 border-b border-navy-400">
        <p className="text-white text-sm font-medium truncate">{user.full_name}</p>
        <p className="text-navy-200 text-xs">{ROLE_LABELS[user.role]}</p>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-white text-navy-500"
                  : "text-navy-100 hover:bg-navy-400 hover:text-white"
              )}
            >
              <item.icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="px-3 pb-4 space-y-1 border-t border-navy-400 pt-3">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-navy-100 hover:bg-navy-400 hover:text-white w-full transition-colors"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
