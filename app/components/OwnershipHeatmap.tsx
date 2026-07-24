"use client";

import { useEffect, useState } from "react";

type FileOwnership = {
  path: string;
  primaryOwner: string;
  ownerPercentage: number;
  totalChanges: number;
  contributors: { username: string; changes: number }[];
  isRisky: boolean;
};

type OwnershipResult = {
  files: FileOwnership[];
  ownerColorMap: Record<string, string>;
  error?: string;
};

export default function OwnershipHeatmap({ owner, repo }: { owner: string; repo: string }) {
  const [data, setData] = useState<OwnershipResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredFile, setHoveredFile] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/ownership/${repo}?owner=${owner}`)
      .then((res) => res.json())
      .then(setData)
      .catch(() => setData({ files: [], ownerColorMap: {}, error: "Failed to load ownership data" }))
      .finally(() => setLoading(false));
  }, [owner, repo]);

  if (loading) {
    return (
      <div className="h-[200px] flex items-center justify-center text-sm text-ink-faint bg-raised rounded-lg border border-dashed border-line">
        Analyzing file ownership...
      </div>
    );
  }

  if (data?.error) {
    return (
      <p className="text-sm text-risk-high bg-raised border border-line rounded-lg p-4">{data.error}</p>
    );
  }

  if (!data || data.files.length === 0) {
    return (
      <p className="text-sm text-ink-faint bg-raised rounded-lg border border-dashed border-line p-4">
        Not enough commit history to compute file ownership.
      </p>
    );
  }

  const riskyCount = data.files.filter((f) => f.isRisky).length;
  const owners = Object.keys(data.ownerColorMap);

  return (
    <div>
      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4">
        {owners.map((o) => (
          <div key={o} className="flex items-center gap-1.5 text-xs text-ink-muted">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: data.ownerColorMap[o] }} />
            {o}
          </div>
        ))}
      </div>

      {riskyCount > 0 && (
        <div className="mb-4 text-xs bg-risk-mid/10 text-risk-mid border border-risk-mid/30 rounded-lg px-3 py-2">
          ⚠️ {riskyCount} file{riskyCount !== 1 ? "s" : ""} with single-contributor ownership — knowledge risk if that person leaves.
        </div>
      )}

      {/* Heatmap grid */}
      <div className="grid grid-cols-8 sm:grid-cols-12 gap-1 mb-4">
        {data.files.map((file) => {
          const color = data.ownerColorMap[file.primaryOwner] || "#94A3B8";
          const opacity = 0.35 + (file.ownerPercentage / 100) * 0.65;
          return (
            <div
              key={file.path}
              onMouseEnter={() => setHoveredFile(file.path)}
              onMouseLeave={() => setHoveredFile(null)}
              className="aspect-square rounded-sm cursor-pointer transition-transform hover:scale-125 relative"
              style={{ backgroundColor: color, opacity }}
              title={`${file.path} — ${file.primaryOwner} (${file.ownerPercentage}%)`}
            />
          );
        })}
      </div>

      {/* Hovered file detail */}
      {hoveredFile && (
        <div className="text-xs bg-raised border border-line rounded-lg p-3 mb-3 font-mono">
          {(() => {
            const f = data.files.find((x) => x.path === hoveredFile)!;
            return (
              <>
                <p className="text-ink font-semibold mb-1">{f.path}</p>
                <p className="text-ink-muted">
                  Primary owner: <span className="text-ink">{f.primaryOwner}</span> ({f.ownerPercentage}% of {f.totalChanges} changes)
                </p>
                {f.isRisky && <p className="text-risk-mid mt-1">⚠️ Single-contributor file</p>}
              </>
            );
          })()}
        </div>
      )}

      <p className="text-xs text-ink-faint">
        Showing top {data.files.length} recently-changed files · color = owner, opacity = ownership concentration
      </p>
    </div>
  );
}
