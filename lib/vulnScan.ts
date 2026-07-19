type Dependency = { name: string; version: string };

export type Vulnerability = {
  id: string;
  summary: string;
  severity: "critical" | "high" | "moderate" | "low" | "unknown";
  fixedVersion: string | null;
};

export type PackageVulnResult = {
  package: string;
  currentVersion: string;
  vulnerabilities: Vulnerability[];
};

export type VulnScanResult = {
  totalDependencies: number;
  vulnerablePackages: PackageVulnResult[];
  criticalCount: number;
  highCount: number;
  moderateCount: number;
  lowCount: number;
  securityScore: number;
  securityLabel: "Secure" | "Needs Attention" | "At Risk";
};

function cleanVersion(version: string): string {
  // Strip semver range prefixes like ^, ~, >=, etc. OSV needs a concrete version
  return version.replace(/^[\^~>=<\s]+/, "").trim();
}

function mapSeverity(severityData: any[]): "critical" | "high" | "moderate" | "low" | "unknown" {
  if (!severityData || severityData.length === 0) return "unknown";

  // OSV severity uses CVSS scores; map score ranges to labels
  const scoreEntry = severityData.find((s: any) => s.type === "CVSS_V3");
  if (!scoreEntry) return "unknown";

  const scoreMatch = /\/([\d.]+)$/.exec(scoreEntry.score || "");
  const numericScore = scoreMatch ? parseFloat(scoreMatch[1]) : null;

  // Fallback: try to parse a plain numeric score
  const score = numericScore ?? parseFloat(scoreEntry.score);

  if (isNaN(score)) return "unknown";
  if (score >= 9.0) return "critical";
  if (score >= 7.0) return "high";
  if (score >= 4.0) return "moderate";
  return "low";
}

async function queryOSVBatch(dependencies: Dependency[]): Promise<any[]> {
  const queries = dependencies.map((dep) => ({
    package: { name: dep.name, ecosystem: "npm" },
    version: cleanVersion(dep.version),
  }));

  const res = await fetch("https://api.osv.dev/v1/querybatch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ queries }),
  });

  if (!res.ok) {
    throw new Error("OSV API request failed");
  }

  const data = await res.json();
  return data.results || [];
}

export async function scanDependencies(dependencies: Dependency[]): Promise<VulnScanResult> {
  if (dependencies.length === 0) {
    return {
      totalDependencies: 0,
      vulnerablePackages: [],
      criticalCount: 0,
      highCount: 0,
      moderateCount: 0,
      lowCount: 0,
      securityScore: 100,
      securityLabel: "Secure",
    };
  }

  // OSV batch API caps at 1000 queries; also batch in chunks of 50 to keep requests fast
  const BATCH_SIZE = 50;
  const vulnerablePackages: PackageVulnResult[] = [];

  for (let i = 0; i < dependencies.length; i += BATCH_SIZE) {
    const chunk = dependencies.slice(i, i + BATCH_SIZE);
    const results = await queryOSVBatch(chunk);

    results.forEach((result: any, idx: number) => {
      const dep = chunk[idx];
      if (result.vulns && result.vulns.length > 0) {
        const vulnerabilities: Vulnerability[] = result.vulns.map((v: any) => ({
          id: v.id,
          summary: v.summary || v.id,
          severity: mapSeverity(v.severity),
          fixedVersion:
            v.affected?.[0]?.ranges?.[0]?.events?.find((e: any) => e.fixed)?.fixed || null,
        }));

        vulnerablePackages.push({
          package: dep.name,
          currentVersion: dep.version,
          vulnerabilities,
        });
      }
    });
  }

  let criticalCount = 0;
  let highCount = 0;
  let moderateCount = 0;
  let lowCount = 0;

  for (const pkg of vulnerablePackages) {
    for (const vuln of pkg.vulnerabilities) {
      if (vuln.severity === "critical") criticalCount++;
      else if (vuln.severity === "high") highCount++;
      else if (vuln.severity === "moderate") moderateCount++;
      else lowCount++;
    }
  }

  // Weighted penalty scoring — critical vulnerabilities hurt the most
  const penalty = criticalCount * 25 + highCount * 12 + moderateCount * 5 + lowCount * 2;
  const securityScore = Math.max(0, 100 - penalty);

  const securityLabel: "Secure" | "Needs Attention" | "At Risk" =
    securityScore >= 80 ? "Secure" : securityScore >= 50 ? "Needs Attention" : "At Risk";

  return {
    totalDependencies: dependencies.length,
    vulnerablePackages,
    criticalCount,
    highCount,
    moderateCount,
    lowCount,
    securityScore,
    securityLabel,
  };
}
