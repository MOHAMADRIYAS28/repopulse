import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "../auth/[...nextauth]/route";
import { scanDependencies } from "../../../lib/vulnScan";

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
    const fileRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/package.json`,
      { headers }
    );

    if (!fileRes.ok) {
      return NextResponse.json(
        { error: "No package.json found in this repository — vulnerability scanning requires an npm project." },
        { status: 404 }
      );
    }

    const fileData = await fileRes.json();
    const content = Buffer.from(fileData.content, "base64").toString("utf-8");
    const packageJson = JSON.parse(content);

    const deps = {
      ...(packageJson.dependencies || {}),
      ...(packageJson.devDependencies || {}),
    };

    const dependencyList = Object.entries(deps).map(([name, version]) => ({
      name,
      version: version as string,
    }));

    // Cap to keep response times reasonable for very large dependency trees
    const cappedList = dependencyList.slice(0, 150);

    const result = await scanDependencies(cappedList);

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: "Failed to scan dependencies" }, { status: 500 });
  }
}
