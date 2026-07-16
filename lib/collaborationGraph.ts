type CommitFile = { filename: string };
type CommitDetail = {
  sha: string;
  author: { login: string } | null;
  commit: { author: { name: string } };
  files?: CommitFile[];
};

export type GraphNode = {
  id: string;
  commits: number;
};

export type GraphLink = {
  source: string;
  target: string;
  weight: number;
};

export type CollaborationGraph = {
  nodes: GraphNode[];
  links: GraphLink[];
};

export function buildCollaborationGraph(commitDetails: CommitDetail[]): CollaborationGraph {
  // Map: filename -> Set of contributor usernames who touched it
  const fileContributors: Record<string, Set<string>> = {};

  // Track total commits per contributor (for node sizing)
  const commitCounts: Record<string, number> = {};

  for (const commit of commitDetails) {
    const username = commit.author?.login || commit.commit.author.name || "unknown";
    commitCounts[username] = (commitCounts[username] || 0) + 1;

    if (!commit.files) continue;

    for (const file of commit.files) {
      if (!fileContributors[file.filename]) {
        fileContributors[file.filename] = new Set();
      }
      fileContributors[file.filename].add(username);
    }
  }

  // Build edges: for every file touched by 2+ contributors, connect each pair
  const edgeWeights: Record<string, number> = {};

  for (const filename in fileContributors) {
    const contributors = Array.from(fileContributors[filename]);
    if (contributors.length < 2) continue;

    for (let i = 0; i < contributors.length; i++) {
      for (let j = i + 1; j < contributors.length; j++) {
        const a = contributors[i];
        const b = contributors[j];
        // Normalize key order so "A|B" and "B|A" are the same edge
        const key = [a, b].sort().join("|");
        edgeWeights[key] = (edgeWeights[key] || 0) + 1;
      }
    }
  }

  const nodes: GraphNode[] = Object.entries(commitCounts).map(([id, commits]) => ({
    id,
    commits,
  }));

  const links: GraphLink[] = Object.entries(edgeWeights).map(([key, weight]) => {
    const [source, target] = key.split("|");
    return { source, target, weight };
  });

  return { nodes, links };
}