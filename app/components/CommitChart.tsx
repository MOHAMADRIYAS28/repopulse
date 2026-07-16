"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

type CommitActivity = { date: string; count: number };

export default function CommitChart({ data }: { data: CommitActivity[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-[200px] flex items-center justify-center text-sm text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
        No commit activity to display
      </div>
    );
  }

  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f5" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            tickFormatter={(date) =>
              new Date(date).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })
            }
            axisLine={false}
            tickLine={false}
            minTickGap={20}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            axisLine={false}
            tickLine={false}
            width={28}
          />
          <Tooltip
            cursor={{ fill: "#f5f5f7" }}
            contentStyle={{
              fontSize: "12px",
              borderRadius: "8px",
              border: "1px solid #e5e7eb",
            }}
            labelFormatter={(date) =>
              new Date(date).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            }
formatter={(value: any) => [`${value} commit${value !== 1 ? "s" : ""}`, ""]}          />
          <Bar
            dataKey="count"
            fill="#4f46e5"
            radius={[4, 4, 0, 0]}
            maxBarSize={48}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}