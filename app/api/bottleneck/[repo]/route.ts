import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "../../auth/[...nextauth]/route";
import { analyzeBottleneck } from "../../../../lib/prBottleneck";

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
    // Fetch the most recent closed/merged PRs (limited to keep API calls manageable)
    const pullsRes = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/pulls?state=closed&per_page=20&sort=updated&direction=desc`,
      { headers }
    );

    if (!pullsRes.ok) {
      return NextResponse.json(
        { error: "Failed to fetch pull requests" },
        { status: pullsRes.status }
      );
    }

    const pulls = await pullsRes.json();

    if (!Array.isArray(pulls) || pulls.length === 0) {
      return NextResponse.json({
        averageTimeToFirstReviewHours: null,
        averageTimeToMergeHours: null,
        slowestPRs: [],
        isBottlenecked: false,
        message: "No pull requests found for this repo.",
      });
    }

    // For each PR, fetch its reviews to find the timestamp of the first review
    const prTimings = await Promise.all(
      pulls.map(async (pr: any) => {
        let firstReviewAt: string | null = null;

        try {
          const reviewsRes = await fetch(
            `https://api.github.com/repos/${owner}/${repoName}/pulls/${pr.number}/reviews`,
            { headers }
          );
          if (reviewsRes.ok) {
            const reviews = await reviewsRes.json();
            if (Array.isArray(reviews) && reviews.length > 0) {
              const sorted = reviews.sort(
                (a: any, b: any) =>
                  new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime()
              );
              firstReviewAt = sorted[0].submitted_at;
            }
          }
        } catch {
          // if fetching reviews fails for one PR, just skip review timing for it
        }

        return {
          number: pr.number,
          title: pr.title,
          createdAt: pr.created_at,
          mergedAt: pr.merged_at,
          firstReviewAt,
        };
      })
    );

    const result = analyzeBottleneck(prTimings);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: "Failed to analyze PR bottlenecks" }, { status: 500 });
  }
}