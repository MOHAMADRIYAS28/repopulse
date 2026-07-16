"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

type RiskPrediction = {
  currentRiskLevel: "low" | "medium" | "high";
  predictedRiskLevel: "low" | "medium" | "high";
  trendDirection: "improving" | "declining" | "stable";
  weeklyTrendSlope: number;
  projectedWeeksToRisk: number | null;
  confidence: "low" | "medium" | "high";
  message: string;
  weeklyActuals: { week: string; commits: number }[];
  weeklyProjected: { week: string; commits: number }[];
};

const riskColors: Record<string, string> = {
  low: "bg-green-50 text-green-700 ring-1 ring-green-200",
  medium: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  high: "bg-red-50 text-red-700 ring-1 ring-red-200",
};

const riskDots: Record<string, string> = {
  low: "bg-green-500",
  medium: "bg-amber-500",
  high: "bg-red-500",
};

function RiskBadge({ level, label }: { level: "low" | "medium" | "high"; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${riskColors[level]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${riskDots[level]}`} />
      {label}
    </span>
  );
}

export default function RiskForecast({ prediction }: { prediction?: RiskPrediction }) {
  if (!prediction) return null;

  if (prediction.weeklyActuals.length === 0) {
    return (
      <p className="text-sm text-gray-500 bg-gray-50 border border-dashed border-gray-200 rounded-lg p-4">
        {prediction.message}
      </p>
    );
  }

  // Merge actuals + projected into one chart dataset
  const chartData = [
    ...prediction.weeklyActuals.map((w) => ({
      week: w.week,
      actual: w.commits,
      projected: null as number | null,
    })),
    ...prediction.weeklyProjected.map((w, i) => ({
      week: w.week,
      actual: null as number | null,
      projected: w.commits,
    })),
  ];

  // Bridge the gap so the projected line visually connects to the last actual point
  if (prediction.weeklyActuals.length > 0 && prediction.weeklyProjected.length > 0) {
    const bridgeIndex = prediction.weeklyActuals.length - 1;
    chartData[bridgeIndex].projected = chartData[bridgeIndex].actual;
  }

  const trendIcon =
    prediction.trendDirection === "declining" ? "📉" : prediction.trendDirection === "improving" ? "📈" : "➡️";

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-xs text-gray-500">Current:</span>
        <RiskBadge level={prediction.currentRiskLevel} label={prediction.currentRiskLevel} />
        <span className="text-xs text-gray-400">→</span>
        <span className="text-xs text-gray-500">Predicted (4 wks):</span>
        <RiskBadge level={prediction.predictedRiskLevel} label={prediction.predictedRiskLevel} />
      </div>

      <div
        className={`rounded-lg p-3 border mb-4 text-sm ${
          prediction.trendDirection === "declining"
            ? "bg-red-50 border-red-200 text-red-800"
            : prediction.trendDirection === "improving"
            ? "bg-green-50 border-green-200 text-green-800"
            : "bg-gray-50 border-gray-200 text-gray-700"
        }`}
      >
        <span className="mr-1.5">{trendIcon}</span>
        {prediction.message}
      </div>

      <div className="h-[200px] w-full mb-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f5" vertical={false} />
            <XAxis
              dataKey="week"
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              tickFormatter={(date) =>
                new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" })
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
              contentStyle={{ fontSize: "12px", borderRadius: "8px", border: "1px solid #e5e7eb" }}
              labelFormatter={(date) =>
                new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
              }
            />
            <Legend wrapperStyle={{ fontSize: "11px" }} />
            <Line
              type="monotone"
              dataKey="actual"
              name="Actual commits/week"
              stroke="#4f46e5"
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="projected"
              name="Projected trend"
              stroke="#f59e0b"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ r: 3 }}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <p className="text-xs text-gray-400">
        Confidence: {prediction.confidence} (based on {prediction.weeklyActuals.length} weeks of history)
      </p>
    </div>
  );
}
