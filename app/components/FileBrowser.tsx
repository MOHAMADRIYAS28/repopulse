"use client";

import { useEffect, useState } from "react";

type FileEntry = { path: string; size: number };

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileBrowser({
  owner,
  repo,
  onSelectFile,
}: {
  owner: string;
  repo: string;
  onSelectFile?: (path: string) => void;
}) {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [filtered, setFiltered] = useState<FileEntry[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [truncated, setTruncated] = useState(false);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError("");
    setSearch("");

    fetch(`/api/file-tree?owner=${owner}&repo=${repo}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          setFiles([]);
        } else {
          setFiles(data.files);
          setFiltered(data.files);
          setTruncated(data.truncated);
        }
      })
      .catch(() => setError("Failed to load file list"))
      .finally(() => setLoading(false));
  }, [owner, repo]);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(files);
    } else {
      const term = search.toLowerCase();
      setFiltered(files.filter((f) => f.path.toLowerCase().includes(term)));
    }
  }, [search, files]);

  const handleCopy = async (path: string) => {
    try {
      await navigator.clipboard.writeText(path);
      setCopiedPath(path);
      setTimeout(() => setCopiedPath(null), 1500);
    } catch {
      // Clipboard API can fail on non-HTTPS/localhost edge cases — fail silently
      setCopiedPath(null);
    }
    onSelectFile?.(path);
  };

  if (loading) {
    return (
      <div className="h-[120px] flex items-center justify-center text-sm text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
        Loading repository files...
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-4">
        {error}
      </p>
    );
  }

  return (
    <div>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={`Search ${files.length} files...`}
        className="w-full text-sm text-gray-900 placeholder-gray-400 border border-gray-200 rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-1 focus:ring-indigo-400"
      />

      {truncated && (
        <p className="text-xs text-amber-600 mb-2">
          This repo has more files than shown — showing the first {files.length}.
        </p>
      )}

      <div className="max-h-72 overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-100">
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-400 p-4">No files match your search.</p>
        ) : (
          filtered.map((file) => (
            <div
              key={file.path}
              className="w-full px-3 py-2 hover:bg-indigo-50 transition-colors flex items-center justify-between gap-3"
            >
              <span className="text-sm text-gray-800 truncate font-mono select-text">
                {file.path}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-gray-400">{formatSize(file.size)}</span>
                <button
                  onClick={() => handleCopy(file.path)}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-md transition-colors"
                >
                  {copiedPath === file.path ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}