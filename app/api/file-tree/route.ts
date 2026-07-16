import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "../auth/[...nextauth]/route";

export async function GET(request: Request) {
  const session: any = await getServerSession(authOptions);
  if (!session || !session.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const owner = searchParams.get("owner");
  const repo = searchParams.get("repo");

  if (!owner || !repo) {
    return NextResponse.json({ error: "owner and repo are required" }, { status: 400 });
  }

  const headers = {
    Authorization: `Bearer ${session.accessToken}`,
    Accept: "application/vnd.github+json",
  };

  try {
    // First, get the repo's default branch
    const repoInfoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
    if (!repoInfoRes.ok) {
      return NextResponse.json({ error: "Repo not found" }, { status: repoInfoRes.status });
    }
    const repoInfo = await repoInfoRes.json();
    const defaultBranch = repoInfo.default_branch || "main";

    // Get the full file tree recursively
    const treeRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`,
      { headers }
    );

    if (!treeRes.ok) {
      return NextResponse.json(
        { error: "Could not fetch file tree" },
        { status: treeRes.status }
      );
    }

    const treeData = await treeRes.json();

    if (!treeData.tree) {
      return NextResponse.json({ files: [], truncated: false });
    }

    // Only return files (type "blob"), not directories, and cap the size returned
    const files = treeData.tree
      .filter((item: any) => item.type === "blob")
      .map((item: any) => ({
        path: item.path,
        size: item.size || 0,
      }))
      .slice(0, 500); // safety cap for very large repos

    return NextResponse.json({
      files,
      truncated: treeData.truncated || files.length === 500,
    });
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch file tree" }, { status: 500 });
  }
}