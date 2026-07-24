type CommitFile = { filename: string };
type CommitDetail = {
  sha: string;
  author: { login: string } | null;
  commit: { author: { name: string } };
  files?: CommitFile[];
};

export type FileOwnership = {
  path: string;
  primaryOwner: string;
  ownerPercentage: number;
  totalChanges: number;
  contributors: { username: string; changes: number }[];
  isRisky: boolean; // single-owner file, no shared knowledge
};

export type OwnershipResult = {
  files: FileOwnership[];
  ownerColorMap: Record<string, string>;
};

const PALETTE = [
  "#3654F4", "#10B981", "#F59E0B", "#EF4444",
  "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16",
];

export function buildOwnershipMap(commitDetails: CommitDetail[]): OwnershipResult {
  const fileContributorCounts: Record<string, Record<string, number>> = {};

  for (const commit of commitDetails) {
    const username = commit.author?.login || commit.commit.author.name || "unknown";
    if (!commit.files) continue;

    for (const file of commit.files) {
      if (!fileContributorCounts[file.filename]) {
        fileContributorCounts[file.filename] = {};
      }
      fileContributorCounts[file.filename][username] =
        (fileContributorCounts[file.filename][username] || 0) + 1;
    }
  }

  const allOwners = new Set<string>();
  const files: FileOwnership[] = Object.entries(fileContributorCounts).map(
    ([path, contributorCounts]) => {
      const contributors = Object.entries(contributorCounts)
        .map(([username, changes]) => ({ username, changes }))
        .sort((a, b) => b.changes - a.changes);

      const totalChanges = contributors.reduce((sum, c) => sum + c.changes, 0);
      const primary = contributors[0];
      const ownerPercentage = Math.round((primary.changes / totalChanges) * 100);

      allOwners.add(primary.username);

      return {
        path,
        primaryOwner: primary.username,
        ownerPercentage,
        totalChanges,
        contributors,
        isRisky: contributors.length === 1 && totalChanges >= 3,
      };
    }
  );

  // Sort by most-changed files first (most significant ownership signal)
  files.sort((a, b) => b.totalChanges - a.totalChanges);

  const ownerColorMap: Record<string, string> = {};
  Array.from(allOwners).forEach((owner, i) => {
    ownerColorMap[owner] = PALETTE[i % PALETTE.length];
  });

  return { files: files.slice(0, 100), ownerColorMap };
}
