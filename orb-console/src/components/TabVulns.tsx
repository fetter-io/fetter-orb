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

import { VulnCard } from "@/components/VulnCard";
import { SystemTagSelector } from "@/components/SystemTagSelector";
import { DashboardStatus } from "@/components/DashboardStatus";
import { VulnCountsChart } from "@/components/VulnCountsChart";
import { AuditEntry, SystemTag, PackageVersions } from "@/types";
import { DataState } from "@/hooks/useDashboardData";

const VIEWPORT_FRACTION = 1.0;
const MIN_LIST_PX = 280;

interface TabVulnsProps {
  auditState: DataState<AuditEntry[]>;
  selectedSystemId: number | null;
  setSelectedSystemId: (id: number | null) => void;
  systemTagsState: DataState<SystemTag[]>;
  packagesState: DataState<PackageVersions[]>;
  highlightedVulnId: string | null;
  onPackageClick: (key: string) => void;
  filteredAuditData: AuditEntry[];
  vulnerablePackageIds: Map<number, number>;
  minVulnScore: number;
  maxVulnScore: number;
  setMinVulnScore: (score: number) => void;
  setMaxVulnScore: (score: number) => void;
}

export interface TabVulnsHandle {
  scrollToVuln: (vulnId: string) => void;
}

export const TabVulns = forwardRef<TabVulnsHandle, TabVulnsProps>(
  function TabVulns(
    {
      auditState,
      selectedSystemId,
      setSelectedSystemId,
      systemTagsState,
      packagesState,
      highlightedVulnId,
      onPackageClick,
      filteredAuditData,
      vulnerablePackageIds,
      minVulnScore,
      maxVulnScore,
      setMinVulnScore,
      setMaxVulnScore,
    },
    ref,
  ) {
    // Virtuoso ref for scrolling control
    const virtuosoRef = useRef<VirtuosoHandle>(null);

    // Always work with a defined array
    const safeAuditData: AuditEntry[] = useMemo(
      () => filteredAuditData ?? [],
      [filteredAuditData],
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
      (index: number, entry: AuditEntry) => {
        if (!entry) return null;
        return (
          <VulnCard
            key={`vuln-pkg-${entry.package_id}`}
            record={entry.record}
            package_id={entry.package_id}
            highlight={`vuln-pkg-${entry.package_id}` === highlightedVulnId}
            onPackageClick={onPackageClick}
            vulnerabilityScore={vulnerablePackageIds.get(entry.package_id) || 0}
          />
        );
      },
      [highlightedVulnId, onPackageClick, vulnerablePackageIds],
    );

    // // Memoize data reference so Virtuoso can optimize
    // const data = useMemo(() => safeAuditData, [safeAuditData]);

    // Expose scroll function to parent component
    useImperativeHandle(
      ref,
      () => ({
        scrollToVuln: (vulnId: string) => {
          const index = safeAuditData.findIndex(
            (entry) => `vuln-pkg-${entry.package_id}` === vulnId,
          );
          if (index !== -1 && virtuosoRef.current) {
            setTimeout(() => {
              if (virtuosoRef.current) {
                virtuosoRef.current.scrollToIndex({
                  index,
                  align: "center",
                });
              }
            }, 150); // Small delay to ensure tab is visible
          }
        },
      }),
      [safeAuditData],
    );

    return (
      <>
        <div className="flex items-center items-end justify-between">
          <div className="flex items-end gap-4">
            <SystemTagSelector
              selectedId={selectedSystemId}
              onChange={setSelectedSystemId}
              systemTags={systemTagsState.data ?? undefined}
              packageCount={packagesState.data?.length ?? 0}
              vulnCount={auditState.data?.length ?? 0}
            />
          </div>
          <div className="flex">
            <DashboardStatus label="vulnerabilities" state={auditState} />
          </div>
        </div>

        {/* Vulnerability Distribution Chart */}
        {auditState.data && auditState.data.length > 0 && (
          <div className="flex flex-col gap-1">
            <VulnCountsChart
              data={auditState.data}
              vulnerablePackageIds={vulnerablePackageIds}
              minVulnScore={minVulnScore}
              maxVulnScore={maxVulnScore}
              onFilterChange={(minBin, maxBin) => {
                // Convert bin indices to scores, handling the special case for bin 9
                const minScore = minBin;
                const maxScore = maxBin >= 9 ? maxBin + 1.0 : maxBin + 0.99;
                setMinVulnScore(minScore);
                setMaxVulnScore(maxScore);
              }}
            />

            {/* Filter Status and Reset */}
            <div className="flex items-center justify-between px-1">
              <span className="text-xs text-gray-600">
                Showing {safeAuditData.length} vulnerable packages
              </span>
              {(minVulnScore > 0 || maxVulnScore < 10) && (
                <button
                  onClick={() => {
                    setMinVulnScore(0);
                    setMaxVulnScore(10);
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
            ref={virtuosoRef}
            style={{
              height: listPxHeight,
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
            className="[&::-webkit-scrollbar]:hidden -mt-2"
            data={safeAuditData}
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
  },
);
