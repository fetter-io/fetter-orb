"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";

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
  expandedVulnCards: Set<number>;
  onVulnCardToggle: (packageId: number, isExpanded: boolean) => void;
  filteredVulnsForDisplay: AuditEntry[] | null;
  setFilteredVulnsForDisplay: (vulns: AuditEntry[] | null) => void;
}

export function TabVulns({
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
  expandedVulnCards,
  onVulnCardToggle,
  filteredVulnsForDisplay,
  setFilteredVulnsForDisplay,
}: TabVulnsProps) {
  // Always work with a defined array
  const safeAuditData: AuditEntry[] = useMemo(
    () => filteredAuditData ?? [],
    [filteredAuditData],
  );

  // Responsive list height - dynamic based on content
  const [listPxHeight, setListPxHeight] = useState<number>(() => {
    if (typeof window === "undefined") return 560; // first paint fallback
    return Math.max(
      MIN_LIST_PX,
      Math.floor(window.innerHeight * VIEWPORT_FRACTION),
    );
  });

  // const [viewportHeight, setViewportHeight] = useState<number>(() => {
  //   if (typeof window === "undefined") return 560;
  //   return window.innerHeight;
  // });

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
        // setViewportHeight(window.innerHeight);
      });
    };
    window.addEventListener("resize", onResize, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  // Calculate height based on number of items
  // Estimate ~140px per vuln card (collapsed), with max and min bounds
  // const ESTIMATED_CARD_HEIGHT = 140;
  // const listPxHeight = useMemo(() => {
  //   const itemCount = safeAuditData.length;
  //   if (itemCount === 0) return MIN_LIST_PX;

  //   const estimatedContentHeight = itemCount * ESTIMATED_CARD_HEIGHT;
  //   const maxHeight = Math.floor(viewportHeight * VIEWPORT_FRACTION);

  //   return Math.max(MIN_LIST_PX, Math.min(estimatedContentHeight, maxHeight));
  // }, [safeAuditData.length, viewportHeight]);

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
          isExpanded={expandedVulnCards.has(entry.package_id)}
          onToggle={(isExpanded) => {
            onVulnCardToggle(entry.package_id, isExpanded);
          }}
        />
      );
    },
    [
      highlightedVulnId,
      onPackageClick,
      vulnerablePackageIds,
      expandedVulnCards,
      onVulnCardToggle,
    ],
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
              // Clear display filter when interacting with chart
              if (filteredVulnsForDisplay) {
                setFilteredVulnsForDisplay(null);
              }
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
            {(minVulnScore > 0 ||
              maxVulnScore < 10 ||
              filteredVulnsForDisplay) && (
              <button
                onClick={() => {
                  setMinVulnScore(0);
                  setMaxVulnScore(10);
                  setFilteredVulnsForDisplay(null);
                  // Collapse all expanded vuln cards
                  expandedVulnCards.forEach((packageId) => {
                    onVulnCardToggle(packageId, false);
                  });
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
          data={safeAuditData}
          // Use itemContent(index, item) signature to avoid undefined object issues
          itemContent={
            renderItem as (
              index: number,
              item: unknown,
            ) => React.JSX.Element | null
          }
          increaseViewportBy={{ top: 200, bottom: 200 }}
          followOutput="auto"
          components={{
            Footer: () => <div style={{ height: "50px" }} />,
          }}
        />
      </div>
    </>
  );
}
