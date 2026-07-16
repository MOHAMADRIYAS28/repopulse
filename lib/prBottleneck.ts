type PRTiming = {
  number: number;
  title: string;
  createdAt: string;
  mergedAt: string | null;
  firstReviewAt: string | null;
};

export type BottleneckResult = {
  averageTimeToFirstReviewHours: number | null;
  averageTimeToMergeHours: number | null;
  slowestPRs: { number: number; title: string; hoursToMerge: number }[];
  isBottlenecked: boolean;
  message: string;
};

export function analyzeBottleneck(prTimings: PRTiming[]): BottleneckResult {
  const mergedPRs = prTimings.filter((pr) => pr.mergedAt !== null);

  if (mergedPRs.length === 0) {
    return {
      averageTimeToFirstReviewHours: null,
      averageTimeToMergeHours: null,
      slowestPRs: [],
      isBottlenecked: false,
      message: "No merged pull requests to analyze yet.",
    };
  }

  // Time to merge = mergedAt - createdAt, in hours
  const mergeTimes = mergedPRs.map((pr) => {
    const created = new Date(pr.createdAt).getTime();
    const merged = new Date(pr.mergedAt!).getTime();
    return {
      number: pr.number,
      title: pr.title,
      hours: (merged - created) / (1000 * 60 * 60),
    };
  });

  const averageTimeToMergeHours =
    mergeTimes.reduce((sum, t) => sum + t.hours, 0) / mergeTimes.length;

  // Time to first review (only for PRs that actually got a review)
  const reviewTimes = prTimings
    .filter((pr) => pr.firstReviewAt !== null)
    .map((pr) => {
      const created = new Date(pr.createdAt).getTime();
      const reviewed = new Date(pr.firstReviewAt!).getTime();
      return (reviewed - created) / (1000 * 60 * 60);
    });

  const averageTimeToFirstReviewHours =
    reviewTimes.length > 0
      ? reviewTimes.reduce((sum, h) => sum + h, 0) / reviewTimes.length
      : null;

  // Flag as bottlenecked if average merge time exceeds 48 hours (2 days) —
  // a common industry benchmark for "healthy" PR turnaround
  const BOTTLENECK_THRESHOLD_HOURS = 48;
  const isBottlenecked = averageTimeToMergeHours > BOTTLENECK_THRESHOLD_HOURS;

  const slowestPRs = [...mergeTimes]
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 5)
    .map((t) => ({
      number: t.number,
      title: t.title,
      hoursToMerge: Math.round(t.hours),
    }));

  const message = isBottlenecked
    ? `Pull requests take an average of ${Math.round(
        averageTimeToMergeHours
      )} hours (${(averageTimeToMergeHours / 24).toFixed(
        1
      )} days) to merge — above the healthy 48-hour benchmark.`
    : `Pull requests merge in a healthy average of ${Math.round(
        averageTimeToMergeHours
      )} hours.`;

  return {
    averageTimeToFirstReviewHours: averageTimeToFirstReviewHours
      ? Math.round(averageTimeToFirstReviewHours)
      : null,
    averageTimeToMergeHours: Math.round(averageTimeToMergeHours),
    slowestPRs,
    isBottlenecked,
    message,
  };
}