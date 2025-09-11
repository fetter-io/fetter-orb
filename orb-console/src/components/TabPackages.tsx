"use client";

import { useState, useMemo } from "react";
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

interface TabPackagesProps {
  packagesState: DataState<PackageVersions[]>;
  packageCountsState: DataState<PackageCountsRecord[]>;
  systemTagsState: DataState<SystemTag[]>;
  auditState: DataState<AuditEntry[]>;
  selectedSystemId: number | null;
  setSelectedSystemId: (id: number | null) => void;
  highlightedPackageKey: string | null;
  vulnerablePackageIds: Map<number, number>;
  onSystemTagClick: (id: number) => void;
  onVulnClick: (id: number) => void;
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
  onSystemTagClick,
  onVulnClick,
}: TabPackagesProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredPackages = useMemo(() => {
    if (!packagesState.data || !searchTerm.trim()) {
      return packagesState.data || [];
    }

    const lowerSearchTerm = searchTerm.toLowerCase();
    return packagesState.data.filter((pkg) =>
      pkg.name.toLowerCase().includes(lowerSearchTerm),
    );
  }, [packagesState.data, searchTerm]);

  return (
    <>
      <div className="flex items-center items-end justify-between">
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
        <PackageCountsChart data={packageCountsState.data} />
      )}

      <div className="flex flex-col gap-2">
        <input
          type="text"
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-md text-slate-400 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-800"
        />

        <div className="flex items-center justify-between py-0">
          <span className="text-xs text-gray-600">
            Showing {filteredPackages.length} of{" "}
            {packagesState.data?.length || 0} packages
          </span>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              Show All
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {filteredPackages.map((pkg) => (
          <PackageVersionsCard
            key={pkg.key}
            pkg={pkg}
            onTagClick={onSystemTagClick}
            onVulnClick={onVulnClick}
            highlight={pkg.key === highlightedPackageKey}
            vulnerablePackageIds={vulnerablePackageIds}
          />
        ))}
      </div>
    </>
  );
}
