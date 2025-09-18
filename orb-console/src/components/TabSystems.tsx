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
  onScatterPointClick?: (systems: SystemTag[]) => void;
  isFiltered?: boolean;
}

export function TabSystems({
  systemTagsState,
  highlightedSystemTagId,
  onPackagesClick,
  setActiveTab,
  onScatterPointClick,
  isFiltered,
}: TabSystemsProps) {

  return (
    <>
      <DashboardStatus label="systems" state={systemTagsState} />

      {systemTagsState.data && systemTagsState.data.length > 0 && (
        <div className="mb-2">
          <SystemStatsChart
            data={systemTagsState.data}
            {...(onScatterPointClick && { onPointClick: onScatterPointClick })}
          />
          <div className="flex justify-end">
            {isFiltered && (
              <button
                onClick={() => onScatterPointClick?.([])}
                className="text-xs text-blue-400 mt-1 px-1 hover:text-blue-300 transition-colors"
              >
                Show All
              </button>
            )}
          </div>
        </div>
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
