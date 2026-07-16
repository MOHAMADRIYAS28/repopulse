"use client";

import { useState } from "react";

type FileHistoryResult = {
  path: string;
  addedBy: { author: string; username: string; date: string; sha: string } | null;
  removedBy: { author: string; username: string; date: string; sha: string } | null;
  totalCommits: number;
  contributors: { author: string; username: string; date: string; message: string; sha: string }[];
  error?: string;
};

export default function FileHistory({ owner, repo }: { owner: string; repo: string }) {
  const [path, setPath] = useState("");
  const [result, setResult] = useState<FileHistoryResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCheck = async () => {
    if (!path.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch(
        `/api/file-history?owner=${owner}&repo=${repo}&path=${encodeURIComponent(path)}`
      );
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setResult({
        path,
        addedBy: null,
        removedBy: null,
        totalCommits: 0,
        contributors: [],
        error: "Request failed",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6">
      <h4 className="text-sm font-semibold text-gray-900 mb-3">
        File History Lookup
      </h4>
      <div className="flex gap-2">
        <input
          value={path}
          onChange={(e) => setPath(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCheck()}
          placeholder="e.g. README.md or src/App.js"
          className="flex-1 text-sm text-gray-900 placeholder-gray-400 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-400"
        />
        <button
          onClick={handleCheck}
          disabled={loading}
          className="text-sm font-medium bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors"
        >
          {loading ? "Checking..." : "Check"}
        </button>
      </div>

      {result?.error && (
        <p className="text-sm text-red-600 font-medium mt-3">{result.error}</p>
      )}

      {result && !result.error && (
        <div className="mt-4 space-y-3 text-sm">
          {result.addedBy && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <span className="font-semibold text-green-900">Added by</span>{" "}
              <span className="text-green-800">
                {result.addedBy.author} ({result.addedBy.username}) on{" "}
                {new Date(result.addedBy.date).toLocaleDateString()}
              </span>
            </div>
          )}

          {result.removedBy && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <span className="font-semibold text-red-900">Removed by</span>{" "}
              <span className="text-red-800">
                {result.removedBy.author} ({result.removedBy.username}) on{" "}
                {new Date(result.removedBy.date).toLocaleDateString()}
              </span>
            </div>
          )}

          {!result.removedBy && (
            <p className="text-xs text-gray-500 font-medium">
              This file still exists in the repo.
            </p>
          )}

          <div>
            <p className="text-xs font-semibold text-gray-700 mb-2">
              Full history ({result.totalCommits} commit{result.totalCommits !== 1 ? "s" : ""})
            </p>
            <div className="max-h-48 overflow-y-auto space-y-1.5">
              {result.contributors.map((c) => (
                <div
                  key={c.sha}
                  className="text-xs text-gray-800 border-b border-gray-100 pb-1.5"
                >
                  <span className="font-semibold text-gray-900">
                    {c.username || c.author}
                  </span>{" "}
                  <span className="text-gray-500">
                    · {new Date(c.date).toLocaleDateString()} —{" "}
                  </span>
                  <span className="text-gray-700">{c.message.split("\n")[0]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}