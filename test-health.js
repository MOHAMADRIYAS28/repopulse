const { calculateHealthScore } = require("./lib/healthScore.ts");

// Simulate a repo with sparse recent activity (should be "At Risk")
const today = new Date();
const daysAgo = (n) => {
  const d = new Date(today);
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
};

const testInput = {
  commitActivity: [
    { date: daysAgo(15), count: 1 },
    { date: daysAgo(35), count: 2 },
    { date: daysAgo(50), count: 1 },
  ],
  openIssues: 1,
  closedIssues: 1,
  openPRs: 0,
  mergedPRs: 1,
};

console.log(calculateHealthScore(testInput));