import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "../auth/[...nextauth]/route";
import { lintCode } from "../../../lib/codeLint";

export async function GET(request: Request) {
  const session: any = await getServerSession(authOptions);
  if (!session || !session.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const owner = searchParams.get("owner");
  const repo = searchParams.get("repo");
  const path = searchParams.get("path");

  if (!owner || !repo || !path) {
    return NextResponse.json(
      { error: "owner, repo, and path are all required" },
      { status: 400 }
    );
  }

  const headers = {
    Authorization: `Bearer ${session.accessToken}`,
    Accept: "application/vnd.github.raw+json",
  };

  try {
    const fileRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`,
      { headers }
    );

    if (!fileRes.ok) {
      return NextResponse.json(
        { error: "File not found in this repo" },
        { status: fileRes.status }
      );
    }

    const contentType = fileRes.headers.get("content-type") || "";
    let content: string;

    if (contentType.includes("application/json")) {
      // GitHub returned metadata JSON instead of raw content (fallback path)
      const json = await fileRes.json();
      if (json.encoding === "base64" && json.content) {
        content = Buffer.from(json.content, "base64").toString("utf-8");
      } else {
        return NextResponse.json({ error: "Could not read file content" }, { status: 500 });
      }
    } else {
      content = await fileRes.text();
    }

    const result = lintCode(path, content);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: "Failed to check file for errors" }, { status: 500 });
  }
}