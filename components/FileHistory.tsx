"use client";
import { useState } from "react";

export default function FileHistory() {
  const [owner, setOwner] = useState("");
  const [repo, setRepo] = useState("");
  const [path, setPath] = useState("");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function fetchHistory() {
    setLoading(true);
    setData(null);
    try {
      const res = await fetch(
        `/api/file-history?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&path=${encodeURIComponent(path)}`
      );
      const json = await res.json();
      setData(json);
    } catch (err) {
      setData({ error: "Something went wrong" });
    }
    setLoading(false);
  }

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h2 className="text-lg font-bold mb-2">File Contributor History</h2>

      <input
        value={owner}
        onChange={(e) => setOwner(e.target.value)}
        placeholder="GitHub owner (e.g. vercel)"
        className="border p-2 rounded w-full mb-2"
      />
      <input
        value={repo}
        onChange={(e) => setRepo(e.target.value)}
        placeholder="Repo name (e.g. next.js)"
        className="border p-2 rounded w-full mb-2"
      />
      <input
        value={path}
        onChange={(e) => setPath(e.target.value)}
        placeholder="File path (e.g. src/components/Button.tsx)"
        className="border p-2 rounded w-full mb-2"
      />

      <button
        onClick={fetchHistory}
        disabled={loading}
        className="px-4 py-2 bg-black text-white rounded"
      >
        {loading ? "Checking..." : "Check History"}
      </button>

      {data?.error && <p className="mt-4 text-red-500">{data.error}</p>}

      {data?.addedBy && (
        <p className="mt-4">
          ✅ Added by <b>{data.addedBy.author}</b> ({data.addedBy.username}) on{" "}
          {new Date(data.addedBy.date).toLocaleDateString()}
        </p>
      )}

      {data?.removedBy && (
        <p>
          ❌ Removed by <b>{data.removedBy.author}</b> ({data.removedBy.username}) on{" "}
          {new Date(data.removedBy.date).toLocaleDateString()}
        </p>
      )}

      {data?.contributors && (
        <div className="mt-4">
          <p className="font-semibold">All commits touching this file:</p>
          <ul className="text-sm mt-1 space-y-1">
            {data.contributors.map((c: any) => (
              <li key={c.sha}>
                {c.author} — {c.message} ({new Date(c.date).toLocaleDateString()})
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
