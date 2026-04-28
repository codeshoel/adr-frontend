"use client";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { DailyMovementCount } from "@/types";

interface MovementTrendChartProps {
  data: DailyMovementCount[];
}

export function MovementTrendChart({ data }: MovementTrendChartProps) {
  const formatted = data.map((d) => ({
    ...d,
    date: new Date(d.movement_date).toLocaleDateString("en-NG", { month: "short", day: "numeric" }),
  }));

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Movement Trend</h3>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={formatted} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="arrivals" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#003366" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#003366" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="departures" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#FFC200" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#FFC200" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
          <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area type="monotone" dataKey="arrivals" stroke="#003366" fill="url(#arrivals)" name="Arrivals" />
          <Area type="monotone" dataKey="departures" stroke="#FFC200" fill="url(#departures)" name="Departures" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
