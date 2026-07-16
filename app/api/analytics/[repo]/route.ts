import { calculateHealthScore } from "../../../../lib/healthScore";
import { detectAnomaly } from "../../../../lib/anomalyDetection";
import { predictRisk } from "../../../../lib/riskPrediction";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "../../auth/[...nextauth]/route";

async function safeJson(res: Response) {
  if (!res.ok || res.status === 204) return [];
  try {
    return await res.json();
  } catch {
    return [];
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ repo: string }> }
) {
  const session: any = await getServerSession(authOptions);
  if (!session || !session.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { repo: repoName } = await params;
  const { searchParams } = new URL(request.url);
  const owner = searchParams.get("owner");
  if (!owner) {
    return NextResponse.json({ error: "Missing owner parameter" }, { status: 400 });
  }
  const headers = {
    Authorization: `Bearer ${session.accessToken}`,
    Accept: "application/vnd.github+json",
  };
  try {
    const [commitsRes, contributorsRes, issuesRes, pullsRes] = await Promise.all([
      fetch(`https://api.github.com/repos/${owner}/${repoName}/commits?per_page=100`, { headers }),
      fetch(`https://api.github.com/repos/${owner}/${repoName}/contributors?per_page=50`, { headers }),
      fetch(`https://api.github.com/repos/${owner}/${repoName}/issues?state=all&per_page=100`, { headers }),
      fetch(`https://api.github.com/repos/${owner}/${repoName}/pulls?state=all&per_page=100`, { headers }),
    ]);
    console.log("Commits status:", commitsRes.status);
    console.log("Contributors status:", contributorsRes.status);
    console.log("Issues status:", issuesRes.status);
    console.log("Pulls status:", pullsRes.status);
    const commits = await safeJson(commitsRes);
    const contributors = await safeJson(contributorsRes);
    const allIssues = await safeJson(issuesRes);
    const pulls = await safeJson(pullsRes);
    const issuesOnly = allIssues.filter((issue: any) => !issue.pull_request);
    const openIssues = issuesOnly.filter((i: any) => i.state === "open").length;
    const closedIssues = issuesOnly.filter((i: any) => i.state === "closed").length;
    const openPRs = pulls.filter((p: any) => p.state === "open").length;
    const mergedPRs = pulls.filter((p: any) => p.merged_at).length;
    const commitsByDate: Record<string, number> = {};
    commits.forEach((commit: any) => {
      const date = commit.commit.author.date.split("T")[0];
      commitsByDate[date] = (commitsByDate[date] || 0) + 1;
    });
    const commitActivity = Object.entries(commitsByDate)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
    const contributorSummary = contributors.map((c: any) => ({
      username: c.login,
      avatar: c.avatar_url,
      commits: c.contributions,
    }));
    const healthScore = calculateHealthScore({
      commitActivity,
      openIssues,
      closedIssues,
      openPRs,
      mergedPRs,
    });
    const anomaly = detectAnomaly(commitActivity);
    const riskPrediction = predictRisk(commitActivity, healthScore.score);

    return NextResponse.json({
      commitCount: commits.length,
      contributors: contributorSummary,
      openIssues,
      closedIssues,
      openPRs,
      mergedPRs,
      commitActivity,
      healthScore,
      anomaly,
      riskPrediction,
    });
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
