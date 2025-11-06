"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";

// SSR-safe Virtuoso (avoids window access during prerender)
const Virtuoso = dynamic(
  () => import("react-virtuoso").then((m) => m.Virtuoso),
  { ssr: false },
);

import { SystemTagSelector } from "@/components/SystemTagSelector";
import { DashboardStatus } from "@/components/DashboardStatus";
import { PackageCountsChart } from "@/components/PackageCountsChart";
import { PackageVersionsCard } from "@/components/PackageVersionsCard";

import {
  SystemTag,
  PackageVersions,
  PackageCountsRecord,
  AuditEntry,
} from "@/types";
import { DataState } from "@/hooks/useDashboardData";

const VIEWPORT_FRACTION = 1.0;
const MIN_LIST_PX = 280;

interface TabPackagesProps {
  packagesState: DataState<PackageVersions[]>;
  packageCountsState: DataState<PackageCountsRecord[]>;
  systemTagsState: DataState<SystemTag[]>;
  auditState: DataState<AuditEntry[]>;
  selectedSystemId: number | null;
  setSelectedSystemId: (id: number | null) => void;
  highlightedPackageKey: string | null;
  vulnerablePackageIds: Map<number, number>;
  validationSets: {
    unrequired: Set<number>;
    misdefined: Set<number>;
  };
  onSystemTagClick: (id: number) => void;
  onVulnClick: (id: number) => void;
  onAllowClick: (status: string) => void;
  filteredPackages: PackageVersions[] | undefined;
  packageSearchTerm: string;
  setPackageSearchTerm: (term: string) => void;
  expandedPackageCards: Set<string>;
  onPackageCardToggle: (packageKey: string, isExpanded: boolean) => void;
  filteredPackagesForDisplay: PackageVersions[] | null;
  setFilteredPackagesForDisplay: (packages: PackageVersions[] | null) => void;
}

export function TabPackages({
  packagesState,
  packageCountsState,
  systemTagsState,
  auditState,
  selectedSystemId,
  setSelectedSystemId,
  highlightedPackageKey,
  vulnerablePackageIds,
  validationSets,
  onSystemTagClick,
  onVulnClick,
  onAllowClick,
  filteredPackages,
  packageSearchTerm,
  setPackageSearchTerm,
  expandedPackageCards,
  onPackageCardToggle,
  filteredPackagesForDisplay,
  setFilteredPackagesForDisplay,
}: TabPackagesProps) {
  // Always work with a defined array
  const safePackages: PackageVersions[] = useMemo(
    () => filteredPackages ?? [],
    [filteredPackages],
  );

  // Responsive list height - dynamic based on content
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
    (index: number, pkg: PackageVersions) => {
      if (!pkg) return null;
      return (
        <PackageVersionsCard
          pkg={pkg}
          onTagClick={onSystemTagClick}
          onVulnClick={onVulnClick}
          highlight={pkg.key === highlightedPackageKey}
          vulnerablePackageIds={vulnerablePackageIds}
          validationSets={validationSets}
          onAllowClick={onAllowClick}
          isExpanded={expandedPackageCards.has(pkg.key)}
          onToggle={(isExpanded) => onPackageCardToggle(pkg.key, isExpanded)}
        />
      );
    },
    [
      onSystemTagClick,
      onVulnClick,
      onAllowClick,
      highlightedPackageKey,
      vulnerablePackageIds,
      validationSets,
      expandedPackageCards,
      onPackageCardToggle,
    ],
  );

  return (
    <>
      <div className="flex items-end justify-between">
        <div className="flex">
          <SystemTagSelector
            selectedId={selectedSystemId}
            onChange={setSelectedSystemId}
            systemTags={systemTagsState.data ?? undefined}
            packageCount={packagesState.data?.length ?? 0}
            vulnCount={auditState.data?.length ?? 0}
          />
        </div>
        <div className="flex">
          <DashboardStatus label="packages" state={packagesState} />
        </div>
      </div>

      {packageCountsState.data && packageCountsState.data.length > 0 && (
        <div
          style={{
            contentVisibility: "auto",
            containIntrinsicSize: "420px 1px",
          }}
        >
          <PackageCountsChart data={packageCountsState.data} />
        </div>
      )}

      <div className="flex flex-col gap-2">
        <input
          type="text"
          placeholder="Search..."
          value={packageSearchTerm}
          onChange={(e) => {
            setPackageSearchTerm(e.target.value);
            // Clear filtered display when user starts searching
            if (filteredPackagesForDisplay && e.target.value.trim()) {
              setFilteredPackagesForDisplay(null);
            }
          }}
          className="px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-md text-slate-400 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-800"
        />
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-gray-600">
            Showing {safePackages.length} of {packagesState.data?.length || 0}{" "}
            packages
          </span>
          {(packageSearchTerm || filteredPackagesForDisplay) && (
            <button
              onClick={() => {
                setPackageSearchTerm("");
                setFilteredPackagesForDisplay(null);
                // Collapse all expanded package cards
                expandedPackageCards.forEach((packageKey) => {
                  onPackageCardToggle(packageKey, false);
                });
              }}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              Show All
            </button>
          )}
        </div>
      </div>

      {/* Virtualized list */}
      <div className="w-full" style={{ height: listPxHeight }}>
        <Virtuoso
          style={{
            height: listPxHeight,
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
          className="[&::-webkit-scrollbar]:hidden -mt-2"
          data={safePackages}
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
