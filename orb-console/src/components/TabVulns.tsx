"use client";

import { useState, useMemo } from "react";
import { VulnCard } from "@/components/VulnCard";
import { SystemTagSelector } from "@/components/SystemTagSelector";
import { DashboardStatus } from "@/components/DashboardStatus";
import { VulnCountsChart } from "@/components/VulnCountsChart";
import { AuditEntry, SystemTag, PackageVersions, VulnRecord } from "@/types";

// Helper function to calculate the highest CVSS score for a vulnerability record
const getPackageVulnerabilityScore = (record: VulnRecord) => {
  const { vuln_ids, vuln_infos } = record;
  let highestScore = 0;
  let highestSeverity = "";

  vuln_ids.forEach((id) => {
    const vuln = vuln_infos[id];
    if (!vuln?.cvss_details) return;

    // Sort CVSS details by version (highest first) and take the first one
    const sortedCvss = vuln.cvss_details.sort((a, b) => {
      const getVersionNumber = (version: string) => {
        const match = version.match(/V(\d+)_(\d+)/);
        if (!match) return 0;
        return parseFloat(`${match[1]}.${match[2]}`);
      };
      return getVersionNumber(b.version) - getVersionNumber(a.version);
    });

    const highestVersionCvss = sortedCvss[0];
    if (highestVersionCvss && highestVersionCvss.score > highestScore) {
      highestScore = highestVersionCvss.score;
      highestSeverity = highestVersionCvss.severity;
    }
  });

  return { score: highestScore, severity: highestSeverity };
};

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
      const vulnScore = getPackageVulnerabilityScore(entry.record);
      scoreMap.set(entry.package_id, vulnScore.score);
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

          {/* Vulnerability Score Filter */}
          <div className="flex items-end gap-2">
            <div className="flex flex-col">
              <label className="text-xs text-gray-400 mb-1">Min CVSS</label>
              <input
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={minVulnScore}
                onChange={(e) => setMinVulnScore(parseFloat(e.target.value) || 0)}
                className="w-16 px-2 py-1 bg-gray-800 border border-gray-600 rounded text-sm text-white"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-gray-400 mb-1">Max CVSS</label>
              <input
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={maxVulnScore}
                onChange={(e) => setMaxVulnScore(parseFloat(e.target.value) || 10)}
                className="w-16 px-2 py-1 bg-gray-800 border border-gray-600 rounded text-sm text-white"
              />
            </div>
            <span className="text-xs text-gray-400 pb-1">
              Showing {filteredAuditData.length} of {auditState.data?.length ?? 0}
            </span>
          </div>
        </div>
        <div className="flex">
          <DashboardStatus label="vulnerabilities" state={auditState} />
        </div>
      </div>

      {/* Vulnerability Distribution Chart */}
      {auditState.data && auditState.data.length > 0 && (
        <VulnCountsChart data={auditState.data} />
      )}

      <div className="flex flex-col gap-4">
        {filteredAuditData.map((entry) => (
          <VulnCard
            key={`vuln-pkg-${entry.package_id}`}
            record={entry.record}
            package_id={entry.package_id}
            highlight={
              `vuln-pkg-${entry.package_id}` === highlightedVulnId
            }
            onPackageClick={onPackageClick}
            vulnerabilityScore={
              vulnerablePackageIds.get(entry.package_id) || 0
            }
          />
        ))}
      </div>
    </>
  );
}