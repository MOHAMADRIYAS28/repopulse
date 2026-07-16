"use client";

import { useEffect, useState } from "react";

type Repo = {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  private: boolean;
  stars: number;
  updatedAt: string;
};

export default function RepoSelector({
  onSelect,
  selectedId,
}: {
  onSelect: (repo: Repo) => void;
  selectedId?: number;
}) {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/repos")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load repositories");
        return res.json();
      })
      .then((data) => {
        setRepos(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div>
        <div className="h-4 w-40 bg-gray-100 rounded mb-3 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-[76px] bg-white border border-gray-200 rounded-lg animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-4">
        Couldn't load your repositories. {error}
      </div>
    );
  }

  if (repos.length === 0) {
    return (
      <div className="bg-white border border-dashed border-gray-300 rounded-lg p-8 text-center">
        <p className="text-gray-500 text-sm">No repositories found on your account yet.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-700">
          Your repositories
        </h2>
        <span className="text-xs text-gray-400">{repos.length} total</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {repos.map((repo) => {
          const isSelected = repo.id === selectedId;
          return (
            <button
              key={repo.id}
              onClick={() => onSelect(repo)}
              className={`text-left bg-white rounded-lg p-4 transition-all border ${
                isSelected
                  ? "border-indigo-500 ring-1 ring-indigo-500 shadow-sm"
                  : "border-gray-200 hover:border-indigo-300 hover:shadow-sm"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-gray-900 truncate text-sm">
                  {repo.name}
                </span>
                {repo.private && (
                  <span className="text-[10px] uppercase tracking-wide bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full shrink-0">
                    Private
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                <span>⭐ {repo.stars}</span>
                <span>·</span>
                <span>Updated {new Date(repo.updatedAt).toLocaleDateString()}</span>
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}