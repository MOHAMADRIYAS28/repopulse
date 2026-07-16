type CommitActivity = { date: string; count: number };

export type RiskPrediction = {
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

function groupByWeek(commitActivity: CommitActivity[]): { weekStart: Date; commits: number }[] {
  const weekMap: Record<string, number> = {};

  for (const entry of commitActivity) {
    const date = new Date(entry.date);
    // Normalize to the Monday of that week
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);

    const key = monday.toISOString().split("T")[0];
    weekMap[key] = (weekMap[key] || 0) + entry.count;
  }

  return Object.entries(weekMap)
    .map(([key, commits]) => ({ weekStart: new Date(key), commits }))
    .sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());
}

// Simple linear regression (least squares) on (x = week index, y = commits)
function linearRegression(points: { x: number; y: number }[]): { slope: number; intercept: number } {
  const n = points.length;
  if (n === 0) return { slope: 0, intercept: 0 };

  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumXX = points.reduce((s, p) => s + p.x * p.x, 0);

  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) return { slope: 0, intercept: sumY / n };

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

export function predictRisk(
  commitActivity: CommitActivity[],
  currentHealthScore: number
): RiskPrediction {
  const weeklyGroups = groupByWeek(commitActivity);

  // Only use the last 12 weeks of history for the trend calculation
  const recentWeeks = weeklyGroups.slice(-12);

  if (recentWeeks.length < 3) {
    return {
      currentRiskLevel: currentHealthScore >= 65 ? "low" : currentHealthScore >= 35 ? "medium" : "high",
      predictedRiskLevel: currentHealthScore >= 65 ? "low" : currentHealthScore >= 35 ? "medium" : "high",
      trendDirection: "stable",
      weeklyTrendSlope: 0,
      projectedWeeksToRisk: null,
      confidence: "low",
      message: "Not enough weekly history yet for a reliable trend projection.",
      weeklyActuals: [],
      weeklyProjected: [],
    };
  }

  const points = recentWeeks.map((w, i) => ({ x: i, y: w.commits }));
  const { slope, intercept } = linearRegression(points);

  const trendDirection: "improving" | "declining" | "stable" =
    slope > 0.15 ? "improving" : slope < -0.15 ? "declining" : "stable";

  const currentRiskLevel: "low" | "medium" | "high" =
    currentHealthScore >= 65 ? "low" : currentHealthScore >= 35 ? "medium" : "high";

  // Project forward 4 weeks using the regression line
  const lastIndex = points.length - 1;
  const weeklyProjected: { week: string; commits: number }[] = [];
  const lastWeekDate = recentWeeks[recentWeeks.length - 1].weekStart;

  let projectedWeeksToRisk: number | null = null;

  for (let i = 1; i <= 4; i++) {
    const projectedX = lastIndex + i;
    const projectedCommits = Math.max(0, Math.round(slope * projectedX + intercept));

    const projectedDate = new Date(lastWeekDate);
    projectedDate.setDate(projectedDate.getDate() + i * 7);

    weeklyProjected.push({
      week: projectedDate.toISOString().split("T")[0],
      commits: projectedCommits,
    });

    // Flag the first future week where projected activity hits zero (a risk signal)
    if (projectedCommits === 0 && projectedWeeksToRisk === null && slope < 0) {
      projectedWeeksToRisk = i;
    }
  }

  // Determine predicted risk level based on trend direction + current level
  let predictedRiskLevel: "low" | "medium" | "high" = currentRiskLevel;

  if (trendDirection === "declining") {
    if (currentRiskLevel === "low") predictedRiskLevel = "medium";
    else if (currentRiskLevel === "medium") predictedRiskLevel = "high";
  } else if (trendDirection === "improving") {
    if (currentRiskLevel === "high") predictedRiskLevel = "medium";
    else if (currentRiskLevel === "medium") predictedRiskLevel = "low";
  }

  const confidence: "low" | "medium" | "high" =
    recentWeeks.length >= 8 ? "high" : recentWeeks.length >= 5 ? "medium" : "low";

  let message: string;
  if (trendDirection === "declining" && projectedWeeksToRisk !== null) {
    message = `Commit activity is trending downward. At this rate, activity may stop entirely within ~${projectedWeeksToRisk} week${projectedWeeksToRisk !== 1 ? "s" : ""}.`;
  } else if (trendDirection === "declining") {
    message = "Commit activity is trending downward over the recent weeks — worth monitoring.";
  } else if (trendDirection === "improving") {
    message = "Commit activity is trending upward — the repo is becoming more active.";
  } else {
    message = "Commit activity has been stable — no significant trend detected.";
  }

  return {
    currentRiskLevel,
    predictedRiskLevel,
    trendDirection,
    weeklyTrendSlope: Math.round(slope * 100) / 100,
    projectedWeeksToRisk,
    confidence,
    message,
    weeklyActuals: recentWeeks.map((w) => ({
      week: w.weekStart.toISOString().split("T")[0],
      commits: w.commits,
    })),
    weeklyProjected,
  };
}
