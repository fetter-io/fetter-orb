"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import dynamic from "next/dynamic";
import type { VirtuosoHandle } from "react-virtuoso";

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

export interface TabSystemsHandle {
  scrollToSystemTag: (systemTagId: number) => void;
}

interface TabSystemsProps {
  systemTagsState: DataState<SystemTag[]>;
  highlightedSystemTagId: number | null;
  onPackagesClick: (id: number) => void;
  setActiveTab: (tab: Tab) => void;
  filteredSystems: SystemTag[] | null;
  setFilteredSystems: (systems: SystemTag[] | null) => void;
}

export const TabSystems = forwardRef<TabSystemsHandle, TabSystemsProps>(
  function TabSystems(
    {
      systemTagsState,
      highlightedSystemTagId,
      onPackagesClick,
      setActiveTab,
      filteredSystems,
      setFilteredSystems,
    },
    ref,
  ) {
    // Virtuoso ref for scrolling control
    const virtuosoRef = useRef<VirtuosoHandle>(null);

    const handleScatterPointClick = (systems: SystemTag[]) => {
      // If empty array is passed, clear the filter
      setFilteredSystems(systems.length > 0 ? systems : null);
    };

    const isFiltered = !!filteredSystems;

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

    // Memoize data reference so Virtuoso can optimize
    const data = useMemo(() => safeSystems, [safeSystems]);

    // Expose scroll function to parent component
    useImperativeHandle(
      ref,
      () => ({
        scrollToSystemTag: (systemTagId: number) => {
          const index = safeSystems.findIndex((tag) => tag.id === systemTagId);
          console.log(
            "Scrolling to system tag:",
            systemTagId,
            "at index:",
            index,
          );
          if (index !== -1 && virtuosoRef.current) {
            // Allow time for tab transition, then scroll smoothly
            setTimeout(() => {
              if (virtuosoRef.current) {
                // Calculate offset to center the item better
                const offsetIndex = Math.max(0, index - 1); // Show 1 item above the target
                virtuosoRef.current.scrollToIndex(offsetIndex);
              }
            }, 150); // Small delay to ensure tab is visible
          }
        },
      }),
      [safeSystems],
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
                  ? `Showing ${filteredSystems?.length || 0} of ${systemTagsState.data?.length || 0} systems`
                  : `Showing ${systemTagsState.data?.length || 0} systems`}
              </span>
              {isFiltered && (
                <button
                  onClick={() => handleScatterPointClick([])}
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
            ref={virtuosoRef}
            style={{
              height: listPxHeight,
              scrollbarWidth: "none" /* Firefox */,
              msOverflowStyle: "none" /* IE and Edge */,
            }}
            className="[&::-webkit-scrollbar]:hidden -mt-2" /* Chrome, Safari, Opera */
            data={data}
            // Use itemContent(index, item) signature to avoid undefined object issues
            itemContent={
              renderItem as (
                index: number,
                item: unknown,
              ) => React.JSX.Element | null
            }
            increaseViewportBy={{ top: 200, bottom: 400 }}
          />
        </div>
      </>
    );
  },
);
