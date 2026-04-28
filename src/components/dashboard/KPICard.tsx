import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface KPICardProps {
  title: string;
  value: number | string;
  delta?: number;
  icon: LucideIcon;
  format?: "number" | "percent" | "currency";
  className?: string;
}

function formatValue(value: number | string, fmt?: string): string {
  if (typeof value === "string") return value;
  if (fmt === "percent") return `${value.toLocaleString()}%`;
  if (fmt === "currency") return `₦${value.toLocaleString()}`;
  return value.toLocaleString();
}

export function KPICard({ title, value, delta, icon: Icon, format, className }: KPICardProps) {
  return (
    <div className={cn("bg-white rounded-xl shadow-sm border border-gray-100 p-5", className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{formatValue(value, format)}</p>
          {delta !== undefined && (
            <p className={cn("text-xs mt-1 font-medium", delta >= 0 ? "text-green-600" : "text-red-600")}>
              {delta >= 0 ? "+" : ""}{delta.toFixed(1)}% vs prev
            </p>
          )}
        </div>
        <div className="w-10 h-10 bg-navy-50 rounded-xl flex items-center justify-center">
          <Icon size={20} className="text-navy-500" />
        </div>
      </div>
    </div>
  );
}
