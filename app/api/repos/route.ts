import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "../auth/[...nextauth]/route";

export async function GET() {
  const session: any = await getServerSession(authOptions);

  if (!session || !session.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const res = await fetch("https://api.github.com/user/repos?sort=updated&per_page=50", {
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      Accept: "application/vnd.github+json",
    },
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to fetch repos" }, { status: res.status });
  }

  const repos = await res.json();

  const simplified = repos.map((repo: any) => ({
    id: repo.id,
    name: repo.name,
    fullName: repo.full_name,
    owner: repo.owner.login,
    private: repo.private,
    stars: repo.stargazers_count,
    updatedAt: repo.updated_at,
  }));

  return NextResponse.json(simplified);
}