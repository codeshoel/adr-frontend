import { cn } from "@/lib/utils";
import { STATUS_CONFIG } from "@/lib/constants";
import type { MovementStatus } from "@/types";

interface StatusBadgeProps {
  status: MovementStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        config?.className ?? "bg-gray-100 text-gray-700",
        className
      )}
    >
      {config?.label ?? status}
    </span>
  );
}
