type CommitActivity = { date: string; count: number };

export type AnomalyResult = {
  type: "spike" | "drop" | "normal" | "insufficient_data";
  message: string;
  percentChange: number | null;
  currentPeriodCommits: number;
  previousPeriodCommits: number;
};

export function detectAnomaly(commitActivity: CommitActivity[]): AnomalyResult {
  const now = new Date();

  const currentPeriodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const previousPeriodStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const currentPeriodCommits = commitActivity
    .filter((c) => new Date(c.date) >= currentPeriodStart)
    .reduce((sum, c) => sum + c.count, 0);

  const previousPeriodCommits = commitActivity
    .filter(
      (c) =>
        new Date(c.date) >= previousPeriodStart &&
        new Date(c.date) < currentPeriodStart
    )
    .reduce((sum, c) => sum + c.count, 0);

  if (previousPeriodCommits === 0 && currentPeriodCommits === 0) {
    return {
      type: "insufficient_data",
      message: "No recent commit history to analyze for trends.",
      percentChange: null,
      currentPeriodCommits,
      previousPeriodCommits,
    };
  }

  if (previousPeriodCommits === 0) {
    return {
      type: "normal",
      message: `${currentPeriodCommits} commit${currentPeriodCommits !== 1 ? "s" : ""} in the last 30 days (no prior period to compare).`,
      percentChange: null,
      currentPeriodCommits,
      previousPeriodCommits,
    };
  }

  const percentChange = Math.round(
    ((currentPeriodCommits - previousPeriodCommits) / previousPeriodCommits) * 100
  );

  if (percentChange <= -50) {
    return {
      type: "drop",
      message: `Commit activity dropped ${Math.abs(percentChange)}% compared to the previous 30 days.`,
      percentChange,
      currentPeriodCommits,
      previousPeriodCommits,
    };
  }

  if (percentChange >= 100) {
    return {
      type: "spike",
      message: `Commit activity increased ${percentChange}% compared to the previous 30 days.`,
      percentChange,
      currentPeriodCommits,
      previousPeriodCommits,
    };
  }

  return {
    type: "normal",
    message: "Commit activity is consistent with the previous period.",
    percentChange,
    currentPeriodCommits,
    previousPeriodCommits,
  };
}