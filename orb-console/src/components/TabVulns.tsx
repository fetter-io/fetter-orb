"use client";

import { VulnCard } from "@/components/VulnCard";
import { SystemTagSelector } from "@/components/SystemTagSelector";
import { DashboardStatus } from "@/components/DashboardStatus";
import { VulnCountsChart } from "@/components/VulnCountsChart";
import { AuditEntry, SystemTag, PackageVersions } from "@/types";
import { DataState } from "@/hooks/useDashboardData";

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
}: TabVulnsProps) {

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
        <div className="flex flex-col gap-1 pb-2">
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
          <div className="flex items-center justify-between py-0 px-1">
            <span className="text-xs text-gray-600">
              Showing {filteredAuditData.length} vulnerable packages
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

      <div className="flex flex-col gap-4">
        {filteredAuditData.map((entry) => (
          <VulnCard
            key={`vuln-pkg-${entry.package_id}`}
            record={entry.record}
            package_id={entry.package_id}
            highlight={`vuln-pkg-${entry.package_id}` === highlightedVulnId}
            onPackageClick={onPackageClick}
            vulnerabilityScore={vulnerablePackageIds.get(entry.package_id) || 0}
          />
        ))}
      </div>
    </>
  );
}
