import { SEVERITY_CONFIG } from "@/lib/constants";
import type { ValidationFlag } from "@/types";

interface ValidationPanelProps {
  flags: ValidationFlag[];
}

export function ValidationPanel({ flags }: ValidationPanelProps) {
  if (flags.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <p className="text-green-700 text-sm font-medium">No validation issues detected.</p>
      </div>
    );
  }

  const grouped = flags.reduce<Record<string, ValidationFlag[]>>((acc, flag) => {
    const key = flag.field_name ?? "general";
    if (!acc[key]) acc[key] = [];
    acc[key].push(flag);
    return acc;
  }, {});

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-gray-700">
        Validation Results ({flags.length} issue{flags.length !== 1 ? "s" : ""})
      </p>
      {Object.entries(grouped).map(([field, fieldFlags]) => (
        <div key={field}>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
            {field === "general" ? "General" : field.replace(/_/g, " ").toUpperCase()}
          </p>
          <div className="space-y-1.5">
            {fieldFlags.map((flag, i) => {
              const config = SEVERITY_CONFIG[flag.severity];
              return (
                <div
                  key={i}
                  className={`border rounded-lg px-3 py-2 text-xs ${config.className}`}
                >
                  <span className="font-semibold uppercase text-xs mr-2">[{config.label}]</span>
                  {flag.flag_message}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
