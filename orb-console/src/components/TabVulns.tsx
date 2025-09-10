"use client";

import { useState, useMemo } from "react";
import { VulnCard } from "@/components/VulnCard";
import { SystemTagSelector } from "@/components/SystemTagSelector";
import { DashboardStatus } from "@/components/DashboardStatus";
import { VulnCountsChart } from "@/components/VulnCountsChart";
import { AuditEntry, SystemTag, PackageVersions } from "@/types";
import { getPackageVulnerabilityScore } from "@/utils/vulnerabilityScore";


interface DataState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  lastFetched: Date | null;
  refresh: () => void;
}

interface TabVulnsProps {
  auditState: DataState<AuditEntry[]>;
  selectedSystemId: number | null;
  setSelectedSystemId: (id: number | null) => void;
  systemTagsState: DataState<SystemTag[]>;
  packagesState: DataState<PackageVersions[]>;
  highlightedVulnId: string | null;
  onPackageClick: (key: string) => void;
}

export function TabVulns({
  auditState,
  selectedSystemId,
  setSelectedSystemId,
  systemTagsState,
  packagesState,
  highlightedVulnId,
  onPackageClick,
}: TabVulnsProps) {
  // Vulnerability score filtering
  const [minVulnScore, setMinVulnScore] = useState<number>(0);
  const [maxVulnScore, setMaxVulnScore] = useState<number>(10);

  const vulnerablePackageIds = useMemo(() => {
    if (!auditState.data) return new Map<number, number>();
    const scoreMap = new Map<number, number>();

    auditState.data.forEach((entry) => {
      const { score } = getPackageVulnerabilityScore(entry.record);
      scoreMap.set(entry.package_id, score);
    });

    return scoreMap;
  }, [auditState.data]);

  // Filter audit data by vulnerability score range
  const filteredAuditData = useMemo(() => {
    if (!auditState.data) return [];

    return auditState.data.filter((entry) => {
      const score = vulnerablePackageIds.get(entry.package_id) || 0;
      return score >= minVulnScore && score <= maxVulnScore;
    });
  }, [auditState.data, vulnerablePackageIds, minVulnScore, maxVulnScore]);

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
            minVulnScore={minVulnScore}
            maxVulnScore={maxVulnScore}
            onFilterChange={(min, max) => {
              setMinVulnScore(min);
              setMaxVulnScore(max);
            }}
          />

          {/* Filter Status and Reset */}
          <div className="flex items-center justify-between py-0">
            <span className="text-xs text-gray-600">
              Selected {filteredAuditData.length} vulnerable packages
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
