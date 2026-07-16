type HealthInput = {
  commitActivity: { date: string; count: number }[];
  openIssues: number;
  closedIssues: number;
  openPRs: number;
  mergedPRs: number;
};

export type HealthResult = {
  score: number;
  label: "Healthy" | "At Risk" | "Stale";
  breakdown: {
    commitFrequencyScore: number;
    issueResolutionScore: number;
    prActivityScore: number;
  };
};

export function calculateHealthScore(input: HealthInput): HealthResult {
  const { commitActivity, openIssues, closedIssues, openPRs, mergedPRs } = input;

  // --- 1. Commit Frequency Score (0-100) ---
  // Combines two signals: how recently the last commit happened, and
  // how many active days there were in the last 90 days.
  let commitFrequencyScore = 0;

  if (commitActivity.length > 0) {
    const now = new Date();
    const sortedDates = commitActivity
      .map((c) => new Date(c.date))
      .sort((a, b) => b.getTime() - a.getTime());

    const lastCommitDate = sortedDates[0];
    const daysSinceLastCommit = Math.floor(
      (now.getTime() - lastCommitDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Recency score: 100 if committed today, decays linearly to 0 at 180 days
    const recencyScore = Math.max(0, 100 - (daysSinceLastCommit / 180) * 100);

    // Frequency score: active days in the last 90 days, scaled to 100 at 25+ active days
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const activeDaysLast90 = commitActivity.filter(
      (c) => new Date(c.date) >= ninetyDaysAgo
    ).length;
    const frequencyScore = Math.min(100, (activeDaysLast90 / 25) * 100);

    // Blend: recency matters slightly more than raw frequency
    commitFrequencyScore = recencyScore * 0.6 + frequencyScore * 0.4;
  }

  // --- 2. Issue Resolution Score (0-100) ---
  const totalIssues = openIssues + closedIssues;
  const issueResolutionScore =
    totalIssues === 0 ? 60 : (closedIssues / totalIssues) * 100;

  // --- 3. PR Activity Score (0-100) ---
  const totalPRs = openPRs + mergedPRs;
  const prActivityScore =
    totalPRs === 0 ? 60 : (mergedPRs / totalPRs) * 100;

  // --- Weighted total ---
  const score = Math.round(
    commitFrequencyScore * 0.6 +
      issueResolutionScore * 0.25 +
      prActivityScore * 0.15
  );

  let label: "Healthy" | "At Risk" | "Stale";
  if (score >= 65) label = "Healthy";
  else if (score >= 35) label = "At Risk";
  else label = "Stale";

  return {
    score,
    label,
    breakdown: {
      commitFrequencyScore: Math.round(commitFrequencyScore),
      issueResolutionScore: Math.round(issueResolutionScore),
      prActivityScore: Math.round(prActivityScore),
    },
  };
}