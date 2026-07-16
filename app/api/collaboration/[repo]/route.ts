import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "../../auth/[...nextauth]/route";
import { buildCollaborationGraph } from "../../../../lib/collaborationGraph";

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
    // Step 1: get the most recent commits (limited to keep API calls manageable)
    const commitsListRes = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/commits?per_page=25`,
      { headers }
    );

    if (!commitsListRes.ok) {
      return NextResponse.json(
        { error: "Failed to fetch commit list" },
        { status: commitsListRes.status }
      );
    }

    const commitsList = await commitsListRes.json();

    if (!Array.isArray(commitsList) || commitsList.length === 0) {
      return NextResponse.json({ nodes: [], links: [] });
    }

    // Step 2: fetch full detail (including changed files) for each commit
    const detailResults = await Promise.all(
      commitsList.map((c: any) =>
        fetch(`https://api.github.com/repos/${owner}/${repoName}/commits/${c.sha}`, { headers })
          .then((res) => (res.ok ? res.json() : null))
          .catch(() => null)
      )
    );

    const validDetails = detailResults.filter((d) => d !== null);

    // Step 3: build the collaboration graph from commit + file data
    const graph = buildCollaborationGraph(validDetails);

    return NextResponse.json(graph);
  } catch (err) {
    return NextResponse.json({ error: "Failed to build collaboration graph" }, { status: 500 });
  }
}