"use client";
import { exportToCSV, exportToPDF } from "../lib/export";
import CommitChart from "./components/CommitChart";
import FileHistory from "./components/FileHistory";
import ContributorGraph from "./components/ContributorGraph";
import BottleneckReport from "./components/BottleneckReport";
import CodeCheck from "./components/CodeCheck";
import FileBrowser from "./components/FileBrowser";
import RiskForecast from "./components/RiskForecast";
import VulnScanner from "./components/VulnScanner";
import Sidebar, { TabId } from "./components/Sidebar";
import { useState } from "react";
import Navbar from "./components/Navbar";
import RepoSelector from "./components/RepoSelector";
import { useSession } from "next-auth/react";

type Analytics = {
  commitCount: number;
  contributors: { username: string; avatar: string; commits: number }[];
  openIssues: number;
  closedIssues: number;
  openPRs: number;
  mergedPRs: number;
  commitActivity: { date: string; count: number }[];
  healthScore: {
    score: number;
    label: "Healthy" | "At Risk" | "Stale";
    breakdown: {
      commitFrequencyScore: number;
      issueResolutionScore: number;
      prActivityScore: number;
    };
  };
  anomaly: {
    type: "spike" | "drop" | "normal" | "insufficient_data";
    message: string;
    percentChange: number | null;
    currentPeriodCommits: number;
    previousPeriodCommits: number;
  };
  riskPrediction: {
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
};

export default function Home() {
  const { data: session } = useSession();
  const [selectedRepo, setSelectedRepo] = useState<any>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  const handleSelectRepo = async (repo: any) => {
    setSelectedRepo(repo);
    setAnalytics(null);
    setLoadFailed(false);
    setLoadingAnalytics(true);
    setActiveTab("overview");

    try {
      const res = await fetch(`/api/analytics/${repo.name}?owner=${repo.owner}`);
      const data = await res.json();

      if (!res.ok || data.error) {
        setLoadFailed(true);
      } else {
        setAnalytics(data);
      }
    } catch (err) {
      console.error("Failed to load analytics", err);
      setLoadFailed(true);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  return (
    <div className="min-h-screen bg-base">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {!session ? (
          <div className="bg-surface rounded-xl border border-line p-8 sm:p-12 min-h-[320px] flex flex-col items-center justify-center text-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center mb-1">
              <span className="text-xl">📊</span>
            </div>
            <h2 className="text-lg font-semibold text-ink">
              See your repository health at a glance
            </h2>
            <p className="text-sm text-ink-muted max-w-sm">
              Sign in with GitHub to pull real-time commit, issue, and pull
              request analytics for any repo you own.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <RepoSelector
              onSelect={handleSelectRepo}
              selectedId={selectedRepo?.id}
            />

            {selectedRepo && (
              <div className="flex flex-col sm:flex-row gap-4">
                <Sidebar
                  activeTab={activeTab}
                  onSelectTab={setActiveTab}
                  repoName={selectedRepo.fullName}
                />

                <div className="flex-1 min-w-0 space-y-6">
                  {activeTab === "overview" && (
                    <div className="bg-surface rounded-xl border border-line p-5 sm:p-6">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
                        <h3 className="font-semibold text-ink text-sm sm:text-base truncate">
                          {selectedRepo.fullName}
                        </h3>
                        <div className="flex items-center gap-2">
                          {analytics && <HealthBadge healthScore={analytics.healthScore} />}
                          {analytics && (
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => exportToCSV(selectedRepo.name, analytics)}
                                className="text-xs font-medium text-ink-muted hover:text-ink bg-raised hover:bg-line px-2.5 py-1 rounded-md transition-colors"
                              >
                                Export CSV
                              </button>
                              <button
                                onClick={() => exportToPDF(selectedRepo.name, analytics)}
                                className="text-xs font-medium text-ink-muted hover:text-ink bg-raised hover:bg-line px-2.5 py-1 rounded-md transition-colors"
                              >
                                Export PDF
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {loadingAnalytics ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {Array.from({ length: 6 }).map((_, i) => (
                            <div
                              key={i}
                              className="h-[76px] bg-base border border-gray-100 rounded-lg animate-pulse"
                            />
                          ))}
                        </div>
                      ) : loadFailed ? (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                          Couldn't load analytics for this repo — it may be empty, or
                          you may not have access to some of its data.
                        </div>
                      ) : analytics ? (
                        <>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <StatCard label="Commits" value={analytics.commitCount} />
                            <StatCard label="Contributors" value={analytics.contributors.length} />
                            <StatCard label="Open issues" value={analytics.openIssues} />
                            <StatCard label="Closed issues" value={analytics.closedIssues} />
                            <StatCard label="Open PRs" value={analytics.openPRs} />
                            <StatCard label="Merged PRs" value={analytics.mergedPRs} />
                          </div>

                          <AnomalyBanner anomaly={analytics.anomaly} />

                          <div className="mt-5">
                            <h4 className="text-xs font-semibold text-ink-muted mb-2">
                              Commit activity
                            </h4>
                            <CommitChart data={analytics.commitActivity} />
                          </div>

                          <div className="mt-5 pt-5 border-t border-gray-100">
                            <h4 className="text-xs font-semibold text-ink-muted mb-3">
                              Predictive Risk Forecast
                            </h4>
                            <RiskForecast prediction={analytics.riskPrediction} />
                          </div>
                        </>
                      ) : null}
                    </div>
                  )}

                  {activeTab === "files" && (
                    <div className="bg-surface rounded-xl border border-line p-5 sm:p-6">
                      <h4 className="text-sm font-semibold text-ink mb-3">
                        Repository Files
                      </h4>
                      <FileBrowser owner={selectedRepo.owner} repo={selectedRepo.name} />
                    </div>
                  )}

                  {activeTab === "history" && (
                    <FileHistory owner={selectedRepo.owner} repo={selectedRepo.name} />
                  )}

                  {activeTab === "collaboration" && (
                    <div className="bg-surface rounded-xl border border-line p-5 sm:p-6">
                      <h4 className="text-sm font-semibold text-ink mb-3">
                        Contributor Collaboration Graph
                      </h4>
                      <ContributorGraph owner={selectedRepo.owner} repo={selectedRepo.name} />
                    </div>
                  )}

                  {activeTab === "bottleneck" && (
                    <div className="bg-surface rounded-xl border border-line p-5 sm:p-6">
                      <h4 className="text-sm font-semibold text-ink mb-3">
                        PR Review Bottleneck Report
                      </h4>
                      <BottleneckReport owner={selectedRepo.owner} repo={selectedRepo.name} />
                    </div>
                  )}

                  {activeTab === "codecheck" && (
                    <CodeCheck owner={selectedRepo.owner} repo={selectedRepo.name} />
                  )}

                  {activeTab === "security" && (
                    <VulnScanner owner={selectedRepo.owner} repo={selectedRepo.name} />
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-base border border-gray-100 rounded-lg p-4 text-center">
      <p className="text-xl sm:text-2xl font-bold text-signal tabular-nums">
        {value}
      </p>
      <p className="text-[11px] sm:text-xs text-ink-muted mt-1">{label}</p>
    </div>
  );
}

function HealthBadge({
  healthScore,
}: {
  healthScore: { score: number; label: string };
}) {
  const styles =
    healthScore.label === "Healthy"
      ? "bg-green-50 text-green-700 ring-1 ring-green-200"
      : healthScore.label === "At Risk"
      ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
      : "bg-red-50 text-red-700 ring-1 ring-red-200";

  const dot =
    healthScore.label === "Healthy"
      ? "bg-green-500"
      : healthScore.label === "At Risk"
      ? "bg-amber-500"
      : "bg-red-500";

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${styles}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {healthScore.label} · {healthScore.score}/100
    </span>
  );
}

function AnomalyBanner({
  anomaly,
}: {
  anomaly?: {
    type: "spike" | "drop" | "normal" | "insufficient_data";
    message: string;
  };
}) {
  if (!anomaly || anomaly.type === "normal" || anomaly.type === "insufficient_data") {
    return null;
  }

  const styles =
    anomaly.type === "drop"
      ? "bg-red-50 border-red-200 text-red-700"
      : "bg-blue-50 border-blue-200 text-blue-700";

  const icon = anomaly.type === "drop" ? "📉" : "📈";

  return (
    <div className={`mt-4 border rounded-lg p-3 text-sm flex items-center gap-2 ${styles}`}>
      <span>{icon}</span>
      <span>{anomaly.message}</span>
    </div>
  );
}
