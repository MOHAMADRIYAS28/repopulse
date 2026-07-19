"use client";

import { useState } from "react";

type Vulnerability = {
  id: string;
  summary: string;
  severity: "critical" | "high" | "moderate" | "low" | "unknown";
  fixedVersion: string | null;
};

type PackageVulnResult = {
  package: string;
  currentVersion: string;
  vulnerabilities: Vulnerability[];
};

type VulnScanResult = {
  totalDependencies: number;
  vulnerablePackages: PackageVulnResult[];
  criticalCount: number;
  highCount: number;
  moderateCount: number;
  lowCount: number;
  securityScore: number;
  securityLabel: "Secure" | "Needs Attention" | "At Risk";
  error?: string;
};

const severityStyles: Record<string, string> = {
  critical: "bg-red-100 text-red-800 border-red-300",
  high: "bg-orange-50 text-orange-700 border-orange-200",
  moderate: "bg-amber-50 text-amber-700 border-amber-200",
  low: "bg-blue-50 text-blue-700 border-blue-200",
  unknown: "bg-gray-50 text-gray-600 border-gray-200",
};

const labelStyles: Record<string, string> = {
  Secure: "bg-green-50 text-green-700 ring-1 ring-green-200",
  "Needs Attention": "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  "At Risk": "bg-red-50 text-red-700 ring-1 ring-red-200",
};

export default function VulnScanner({ owner, repo }: { owner: string; repo: string }) {
  const [result, setResult] = useState<VulnScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);

  const handleScan = async () => {
    setLoading(true);
    setStarted(true);
    setResult(null);

    try {
      const res = await fetch(`/api/vuln-scan?owner=${owner}&repo=${repo}`);
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({
        totalDependencies: 0,
        vulnerablePackages: [],
        criticalCount: 0,
        highCount: 0,
        moderateCount: 0,
        lowCount: 0,
        securityScore: 0,
        securityLabel: "At Risk",
        error: "Scan request failed",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6">
      <div className="flex items-center justify-between mb-1">
        <h4 className="text-sm font-semibold text-gray-900">
          Dependency Vulnerability Scanner
        </h4>
        {result && !result.error && (
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${labelStyles[result.securityLabel]}`}>
            {result.securityLabel} · {result.securityScore}/100
          </span>
        )}
      </div>
      <p className="text-xs text-gray-500 mb-3">
        Checks package.json dependencies against the OSV.dev vulnerability database.
      </p>

      {!started && (
        <button
          onClick={handleScan}
          className="text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Scan Dependencies
        </button>
      )}

      {loading && (
        <p className="text-sm text-gray-400">Scanning dependencies against vulnerability database...</p>
      )}

      {result?.error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 mt-2">
          {result.error}
        </p>
      )}

      {result && !result.error && !loading && (
        <div className="mt-3">
          <div className="grid grid-cols-4 gap-2 mb-4">
            <div className="bg-red-50 border border-red-100 rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-red-700">{result.criticalCount}</p>
              <p className="text-[10px] text-red-600">Critical</p>
            </div>
            <div className="bg-orange-50 border border-orange-100 rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-orange-700">{result.highCount}</p>
              <p className="text-[10px] text-orange-600">High</p>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-amber-700">{result.moderateCount}</p>
              <p className="text-[10px] text-amber-600">Moderate</p>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-blue-700">{result.lowCount}</p>
              <p className="text-[10px] text-blue-600">Low</p>
            </div>
          </div>

          <p className="text-xs text-gray-400 mb-3">
            Scanned {result.totalDependencies} dependencies
          </p>

          {result.vulnerablePackages.length === 0 ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800 font-medium">
              ✅ No known vulnerabilities found in scanned dependencies
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {result.vulnerablePackages.map((pkg) => (
                <div key={pkg.package} className="border border-gray-100 rounded-lg p-3">
                  <p className="text-sm font-semibold text-gray-900">
                    {pkg.package}
                    <span className="text-gray-400 font-normal"> · {pkg.currentVersion}</span>
                  </p>
                  <div className="mt-1.5 space-y-1">
                    {pkg.vulnerabilities.map((v) => (
                      <div
                        key={v.id}
                        className={`text-xs rounded-md px-2 py-1.5 border ${severityStyles[v.severity]}`}
                      >
                        <span className="font-semibold uppercase">{v.severity}</span> — {v.summary}
                        {v.fixedVersion && (
                          <span className="block text-gray-500 mt-0.5">
                            Fix available: upgrade to {v.fixedVersion}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleScan}
            className="text-xs text-indigo-600 hover:text-indigo-800 mt-3"
          >
            Re-scan
          </button>
        </div>
      )}
    </div>
  );
}
