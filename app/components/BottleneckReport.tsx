"use client";

import { useEffect, useState } from "react";

type BottleneckData = {
  averageTimeToFirstReviewHours: number | null;
  averageTimeToMergeHours: number | null;
  slowestPRs: { number: number; title: string; hoursToMerge: number }[];
  isBottlenecked: boolean;
  message: string;
  error?: string;
};

function formatHours(hours: number | null) {
  if (hours === null) return "N/A";
  if (hours < 24) return `${hours}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

export default function BottleneckReport({ owner, repo }: { owner: string; repo: string }) {
  const [data, setData] = useState<BottleneckData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/bottleneck/${repo}?owner=${owner}`)
      .then((res) => res.json())
      .then((result) => setData(result))
      .catch(() =>
        setData({
          averageTimeToFirstReviewHours: null,
          averageTimeToMergeHours: null,
          slowestPRs: [],
          isBottlenecked: false,
          message: "",
          error: "Failed to load PR bottleneck data",
        })
      )
      .finally(() => setLoading(false));
  }, [owner, repo]);

  if (loading) {
    return (
      <div className="h-[140px] flex items-center justify-center text-sm text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
        Analyzing PR review turnaround...
      </div>
    );
  }

  if (!data || data.error) {
    return (
      <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-4">
        {data?.error || "Could not load data"}
      </p>
    );
  }

  if (data.averageTimeToMergeHours === null) {
    return (
      <p className="text-sm text-gray-500 bg-gray-50 border border-dashed border-gray-200 rounded-lg p-4">
        {data.message}
      </p>
    );
  }

  return (
    <div>
      <div
        className={`rounded-lg p-4 border mb-4 ${
          data.isBottlenecked
            ? "bg-amber-50 border-amber-200"
            : "bg-green-50 border-green-200"
        }`}
      >
        <p
          className={`text-sm font-medium ${
            data.isBottlenecked ? "text-amber-800" : "text-green-800"
          }`}
        >
          {data.isBottlenecked ? "⚠️ Review bottleneck detected" : "✅ Healthy review turnaround"}
        </p>
        <p className={`text-xs mt-1 ${data.isBottlenecked ? "text-amber-700" : "text-green-700"}`}>
          {data.message}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-indigo-600">
            {formatHours(data.averageTimeToFirstReviewHours)}
          </p>
          <p className="text-[11px] text-gray-500 mt-1">Avg. time to first review</p>
        </div>
        <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-indigo-600">
            {formatHours(data.averageTimeToMergeHours)}
          </p>
          <p className="text-[11px] text-gray-500 mt-1">Avg. time to merge</p>
        </div>
      </div>

      {data.slowestPRs.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-700 mb-2">Slowest PRs to merge</p>
          <div className="space-y-1.5">
            {data.slowestPRs.map((pr) => (
              <div
                key={pr.number}
                className="flex items-center justify-between text-xs bg-gray-50 rounded-md px-3 py-2"
              >
                <span className="text-gray-800 truncate mr-2">
                  #{pr.number} {pr.title}
                </span>
                <span className="text-gray-500 font-medium shrink-0">
                  {formatHours(pr.hoursToMerge)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}