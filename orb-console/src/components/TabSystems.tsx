"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";

// SSR-safe Virtuoso (avoids window access during prerender)
const Virtuoso = dynamic(
  () => import("react-virtuoso").then((m) => m.Virtuoso),
  { ssr: false },
);

import { DashboardStatus } from "@/components/DashboardStatus";
import { SystemTagCard } from "@/components/SystemTagCard";
import { SystemStatsChart } from "@/components/SystemStatsChart";
import { SystemTag, Tab } from "@/types";
import { DataState } from "@/hooks/useDashboardData";

const VIEWPORT_FRACTION = 1.0;
const MIN_LIST_PX = 280;

interface TabSystemsProps {
  systemTagsState: DataState<SystemTag[]>;
  highlightedSystemTagId: number | null;
  onPackagesClick: (id: number) => void;
  setActiveTab: (tab: Tab) => void;
  filteredSystems: SystemTag[] | null;
  chartFilteredSystems: SystemTag[] | null;
  setChartFilteredSystems: (systems: SystemTag[] | null) => void;
  filteredSystemsForDisplay: SystemTag[] | null;
  setFilteredSystemsForDisplay: (systems: SystemTag[] | null) => void;
}

export function TabSystems({
  systemTagsState,
  highlightedSystemTagId,
  onPackagesClick,
  setActiveTab,
  filteredSystems,
  chartFilteredSystems,
  setChartFilteredSystems,
  filteredSystemsForDisplay,
  setFilteredSystemsForDisplay,
}: TabSystemsProps) {
  const handleScatterPointClick = (systems: SystemTag[]) => {
    // Clear display filter when interacting with chart
    if (filteredSystemsForDisplay) {
      setFilteredSystemsForDisplay(null);
    }
    // If empty array is passed, clear the filter
    setChartFilteredSystems(systems.length > 0 ? systems : null);
  };

  const isFiltered = !!(chartFilteredSystems || filteredSystemsForDisplay);

  // Always work with a defined array
  const safeSystems: SystemTag[] = useMemo(
    () => filteredSystems || systemTagsState.data || [],
    [filteredSystems, systemTagsState.data],
  );

  // Responsive list height
  const [listPxHeight, setListPxHeight] = useState<number>(() => {
    if (typeof window === "undefined") return 560; // first paint fallback
    return Math.max(
      MIN_LIST_PX,
      Math.floor(window.innerHeight * VIEWPORT_FRACTION),
    );
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    let raf = 0;
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        setListPxHeight(
          Math.max(
            MIN_LIST_PX,
            Math.floor(window.innerHeight * VIEWPORT_FRACTION),
          ),
        );
      });
    };
    window.addEventListener("resize", onResize, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  // Stable render function for items
  const renderItem = useCallback(
    (index: number, tag: SystemTag) => {
      if (!tag) return null;
      return (
        <SystemTagCard
          key={tag.id}
          tag={tag}
          highlight={tag.id === highlightedSystemTagId}
          onPackagesClick={(id) => {
            onPackagesClick(id);
            setActiveTab("packages");
          }}
        />
      );
    },
    [highlightedSystemTagId, onPackagesClick, setActiveTab],
  );

  return (
    <>
      <DashboardStatus label="systems" state={systemTagsState} />

      {systemTagsState.data && systemTagsState.data.length > 0 && (
        <div className="mb-0">
          <SystemStatsChart
            data={systemTagsState.data}
            onPointClick={handleScatterPointClick}
          />
          <div className="flex items-center justify-between py-0 px-1 mt-1">
            <span className="text-xs text-gray-600">
              {isFiltered
                ? `Showing ${safeSystems?.length || 0} of ${systemTagsState.data?.length || 0} systems`
                : `Showing ${systemTagsState.data?.length || 0} systems`}
            </span>
            {isFiltered && (
              <button
                onClick={() => {
                  setChartFilteredSystems(null);
                  setFilteredSystemsForDisplay(null);
                }}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                Show All
              </button>
            )}
          </div>
        </div>
      )}

      {/* Virtualized list */}
      <div className="w-full" style={{ height: listPxHeight }}>
        <Virtuoso
          style={{
            height: listPxHeight,
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
          className="[&::-webkit-scrollbar]:hidden -mt-2"
          data={safeSystems}
          // Use itemContent(index, item) signature to avoid undefined object issues
          itemContent={
            renderItem as (
              index: number,
              item: unknown,
            ) => React.JSX.Element | null
          }
          increaseViewportBy={{ top: 200, bottom: 200 }}
        />
      </div>
    </>
  );
}
