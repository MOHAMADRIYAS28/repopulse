import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type AnalyticsData = {
  commitCount: number;
  contributors: { username: string; commits: number }[];
  openIssues: number;
  closedIssues: number;
  openPRs: number;
  mergedPRs: number;
  commitActivity: { date: string; count: number }[];
  healthScore: { score: number; label: string };
};

export function exportToCSV(repoName: string, data: AnalyticsData) {
  const rows: string[][] = [
    ["Metric", "Value"],
    ["Repository", repoName],
    ["Health Score", `${data.healthScore.score}/100`],
    ["Health Label", data.healthScore.label],
    ["Total Commits", String(data.commitCount)],
    ["Contributors", String(data.contributors.length)],
    ["Open Issues", String(data.openIssues)],
    ["Closed Issues", String(data.closedIssues)],
    ["Open PRs", String(data.openPRs)],
    ["Merged PRs", String(data.mergedPRs)],
    [],
    ["Contributor", "Commits"],
    ...data.contributors.map((c) => [c.username, String(c.commits)]),
    [],
    ["Date", "Commits"],
    ...data.commitActivity.map((d) => [d.date, String(d.count)]),
  ];

  const csvContent = rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${repoName}-analytics.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportToPDF(repoName: string, data: AnalyticsData) {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.setTextColor(79, 70, 229);
  doc.text("RepoPulse Analytics Report", 14, 20);

  doc.setFontSize(11);
  doc.setTextColor(80, 80, 80);
  doc.text(`Repository: ${repoName}`, 14, 30);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 36);

  doc.setFontSize(13);
  doc.setTextColor(0, 0, 0);
  doc.text(`Health Score: ${data.healthScore.score}/100 (${data.healthScore.label})`, 14, 46);

  autoTable(doc, {
    startY: 54,
    head: [["Metric", "Value"]],
    body: [
      ["Total Commits", String(data.commitCount)],
      ["Contributors", String(data.contributors.length)],
      ["Open Issues", String(data.openIssues)],
      ["Closed Issues", String(data.closedIssues)],
      ["Open PRs", String(data.openPRs)],
      ["Merged PRs", String(data.mergedPRs)],
    ],
    theme: "striped",
    headStyles: { fillColor: [79, 70, 229] },
    styles: { fontSize: 10 },
  });

  const afterFirstTable = (doc as any).lastAutoTable.finalY + 10;

  doc.setFontSize(13);
  doc.text("Contributors", 14, afterFirstTable);

  autoTable(doc, {
    startY: afterFirstTable + 4,
    head: [["Username", "Commits"]],
    body: data.contributors.map((c) => [c.username, String(c.commits)]),
    theme: "striped",
    headStyles: { fillColor: [79, 70, 229] },
    styles: { fontSize: 10 },
  });

  doc.save(`${repoName}-analytics.pdf`);
}