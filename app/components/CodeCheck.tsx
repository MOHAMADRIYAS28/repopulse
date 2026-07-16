"use client";

import { useState } from "react";

type LintIssue = {
  line: number;
  column: number;
  severity: "error" | "warning";
  message: string;
  ruleId: string | null;
};

type LintResult = {
  fileName: string;
  language: string;
  issues: LintIssue[];
  errorCount: number;
  warningCount: number;
  isClean: boolean;
  checkType: "full" | "structural";
  error?: string;
};

export default function CodeCheck({ owner, repo }: { owner: string; repo: string }) {
  const [path, setPath] = useState("");
  const [result, setResult] = useState<LintResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCheck = async () => {
    if (!path.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch(
        `/api/code-check?owner=${owner}&repo=${repo}&path=${encodeURIComponent(path)}`
      );
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({
        fileName: path,
        language: "unknown",
        issues: [],
        errorCount: 0,
        warningCount: 0,
        isClean: true,
        checkType: "structural",
        error: "Request failed",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6">
      <h4 className="text-sm font-semibold text-gray-900 mb-1">
        Code Quality Checker
      </h4>
      <p className="text-xs text-gray-500 mb-3">
        Check any file for syntax errors before it goes further.
      </p>
      <div className="flex gap-2">
        <input
          value={path}
          onChange={(e) => setPath(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCheck()}
          placeholder="e.g. src/main.py or app.js"
          className="flex-1 text-sm text-gray-900 placeholder-gray-400 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-400"
        />
        <button
          onClick={handleCheck}
          disabled={loading}
          className="text-sm font-medium bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors"
        >
          {loading ? "Checking..." : "Check file"}
        </button>
      </div>

      {result?.error && (
        <p className="text-sm text-red-600 font-medium mt-3">{result.error}</p>
      )}

      {result && !result.error && (
        <div className="mt-4">
          {result.checkType === "structural" && (
            <p className="text-xs text-gray-500 bg-gray-50 border border-dashed border-gray-200 rounded-lg p-2 mb-3">
              "{result.fileName}" ({result.language}) is checked with a structural
              scan (unbalanced brackets/quotes) rather than full language-specific
              linting.
            </p>
          )}

          {result.isClean ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800 font-medium">
              ✅ No issues found in {result.fileName}
            </div>
          ) : (
            <div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800 font-medium mb-3">
                Found {result.errorCount} error{result.errorCount !== 1 ? "s" : ""} and{" "}
                {result.warningCount} warning{result.warningCount !== 1 ? "s" : ""} in{" "}
                {result.fileName}
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {result.issues.map((issue, i) => (
                  <div
                    key={i}
                    className={`text-xs rounded-md px-3 py-2 border ${
                      issue.severity === "error"
                        ? "bg-red-50 border-red-200 text-red-800"
                        : "bg-amber-50 border-amber-200 text-amber-800"
                    }`}
                  >
                    <span className="font-semibold">
                      Line {issue.line}:{issue.column}
                    </span>{" "}
                    — {issue.message}
                    {issue.ruleId && (
                      <span className="text-gray-500"> ({issue.ruleId})</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
