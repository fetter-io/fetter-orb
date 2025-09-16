"use client";

import { DashboardStatus } from "@/components/DashboardStatus";
import { SystemTagCard } from "@/components/SystemTagCard";
import { SystemStatsChart } from "@/components/SystemStatsChart";
import { SystemTag, Tab } from "@/types";
import { DataState } from "@/hooks/useDashboardData";

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

      {systemTagsState.data && systemTagsState.data.length > 0 && (
        <SystemStatsChart data={systemTagsState.data} />
      )}

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
