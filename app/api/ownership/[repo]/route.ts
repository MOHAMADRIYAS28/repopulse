import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "../../auth/[...nextauth]/route";
import { buildOwnershipMap } from "../../../../lib/codeOwnership";

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
    const commitsListRes = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/commits?per_page=40`,
      { headers }
    );

    if (!commitsListRes.ok) {
      return NextResponse.json({ error: "Failed to fetch commits" }, { status: commitsListRes.status });
    }

    const commitsList = await commitsListRes.json();

    if (!Array.isArray(commitsList) || commitsList.length === 0) {
      return NextResponse.json({ files: [], ownerColorMap: {} });
    }

    const detailResults = await Promise.all(
      commitsList.map((c: any) =>
        fetch(`https://api.github.com/repos/${owner}/${repoName}/commits/${c.sha}`, { headers })
          .then((res) => (res.ok ? res.json() : null))
          .catch(() => null)
      )
    );

    const validDetails = detailResults.filter((d) => d !== null);
    const result = buildOwnershipMap(validDetails);

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: "Failed to compute ownership map" }, { status: 500 });
  }
}
