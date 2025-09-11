"use client";

import { DashboardStatus } from "@/components/DashboardStatus";
import { SystemTagCard } from "@/components/SystemTagCard";
import { SystemTag, Tab } from "@/types";

interface DataState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  lastFetched: Date | null;
  refresh: () => void;
}

interface TabSystemsProps {
  systemTagsState: DataState<SystemTag[]>;
  highlightedSystemTagId: number | null;
  onPackagesClick: (id: number) => void;
  setActiveTab: (tab: Tab) => void;
}

export function TabSystems({
  systemTagsState,
  highlightedSystemTagId,
  onPackagesClick,
  setActiveTab,
}: TabSystemsProps) {
  return (
    <>
      <DashboardStatus label="systems" state={systemTagsState} />

      <div className="flex flex-col gap-4">
        {systemTagsState.data?.map((tag) => (
          <SystemTagCard
            key={tag.id}
            tag={tag}
            highlight={tag.id === highlightedSystemTagId}
            onPackagesClick={(id) => {
              onPackagesClick(id);
              setActiveTab("packages");
            }}
          />
        ))}
      </div>
    </>
  );
}
