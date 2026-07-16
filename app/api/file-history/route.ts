import { Octokit } from "octokit";
import { NextRequest, NextResponse } from "next/server";

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const owner = searchParams.get("owner");
  const repo = searchParams.get("repo");
  const path = searchParams.get("path");

  if (!owner || !repo || !path) {
    return NextResponse.json({ error: "owner, repo, path are required" }, { status: 400 });
  }

  try {
    const { data: commits } = await octokit.rest.repos.listCommits({
      owner,
      repo,
      path,
      per_page: 100,
    });

    if (commits.length === 0) {
      return NextResponse.json({ error: "No history found for this file" }, { status: 404 });
    }

    const oldest = commits[commits.length - 1];
    const newest = commits[0];

    const [oldestDetail, newestDetail] = await Promise.all([
      octokit.rest.repos.getCommit({ owner, repo, ref: oldest.sha }),
      octokit.rest.repos.getCommit({ owner, repo, ref: newest.sha }),
    ]);

    const addedFile = oldestDetail.data.files?.find((f) => f.filename === path);
    const newestFile = newestDetail.data.files?.find((f) => f.filename === path);

    const addedBy =
      addedFile?.status === "added"
        ? {
            author: oldest.commit.author?.name,
            username: oldest.author?.login,
            date: oldest.commit.author?.date,
            sha: oldest.sha,
          }
        : null;

    const removedBy =
      newestFile?.status === "removed"
        ? {
            author: newest.commit.author?.name,
            username: newest.author?.login,
            date: newest.commit.author?.date,
            sha: newest.sha,
          }
        : null;

    const contributors = commits.map((c) => ({
      author: c.commit.author?.name,
      username: c.author?.login,
      date: c.commit.author?.date,
      message: c.commit.message,
      sha: c.sha,
    }));

    return NextResponse.json({
      path,
      addedBy,
      removedBy,
      totalCommits: commits.length,
      contributors,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
