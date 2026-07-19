"use client";

type TabId =
  | "overview"
  | "files"
  | "history"
  | "collaboration"
  | "bottleneck"
  | "codecheck"
  | "security";

const tabs: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "files", label: "Files" },
  { id: "history", label: "File History" },
  { id: "collaboration", label: "Collaboration" },
  { id: "bottleneck", label: "PR Bottleneck" },
  { id: "codecheck", label: "Code Quality" },
  { id: "security", label: "Security Scan" },
];

export default function Sidebar({
  activeTab,
  onSelectTab,
  repoName,
}: {
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
  repoName?: string;
}) {
  return (
    <aside className="w-full sm:w-52 shrink-0 card p-2.5 sm:sticky sm:top-20 h-fit">
      {repoName && (
        <p className="text-[11px] text-ink-faint px-2 mb-2 truncate font-mono" title={repoName}>
          {repoName}
        </p>
      )}
      <nav className="flex sm:flex-col gap-0.5 overflow-x-auto sm:overflow-visible">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={`relative text-left text-sm px-3 py-2 rounded-lg transition-colors whitespace-nowrap sm:whitespace-normal shrink-0 ${
              activeTab === tab.id
                ? "bg-signal/10 text-signal font-medium"
                : "text-ink-muted hover:bg-raised hover:text-ink"
            }`}
          >
            {activeTab === tab.id && (
              <span className="hidden sm:block absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-signal rounded-full" />
            )}
            {tab.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}

export type { TabId };
