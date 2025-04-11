"use client";

import Image from "next/image";
import { useState, useCallback, useEffect, useMemo } from "react";
// import { PackageCard } from "@/components/PackageCard";
import { Footer } from "@/components/Footer";
import { useDashboardData } from "@/hooks/useDashboardData";
import { SystemTagCard } from "@/components/SystemTagCard";
import { DashboardStatus } from "@/components/DashboardStatus";
import { TabSelector } from "@/components/TabSelector";
import {
  PackageVersions,
  PackageCountsRecord,
  SystemTag,
  Tab,
  AuditEntry,
} from "@/types";
import { PackageVersionsCard } from "@/components/PackageVersionsCard";
import { SystemTagSelector } from "@/components/SystemTagSelector";
import { PackageCountsChart } from "@/components/PackageCountsChart";
import { VulnCard } from "@/components/VulnCard";

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("packages");
  const [selectedSystemId, setSelectedSystemId] = useState<number | null>(null);
  const [highlightedSystemTagId, setHighlightedSystemTagId] = useState<
    number | null
  >(null);
  const [highlightedPackageKey, setHighlightedPackageKey] = useState<
    string | null
  >(null);
  const [highlightedVulnId, setHighlightedVulnId] = useState<string | null>(
    null,
  );

  // fetch system tags
  const fetchSystemTags = useCallback(async (): Promise<SystemTag[]> => {
    const apiBase = process.env.NEXT_PUBLIC_ORB_MODEL!;
    const res = await fetch(`${apiBase}/system_tag_pings`);
    const raw = await res.json();
    return raw as SystemTag[];
  }, []);

  const fetchPackages = useCallback(async (): Promise<PackageVersions[]> => {
    const apiBase = process.env.NEXT_PUBLIC_ORB_MODEL!;
    const query =
      selectedSystemId !== null ? `?system_tag_id=${selectedSystemId}` : "";
    const res = await fetch(`${apiBase}/package_versions${query}`);
    const raw = await res.json();

    return Object.entries(raw).map(([key, value]) => {
      const casted = value as Omit<PackageVersions, "key">;
      return {
        key,
        name: casted.name,
        data: casted.data,
      };
    });
  }, [selectedSystemId]);

  const fetchPackageCounts = useCallback(async (): Promise<
    PackageCountsRecord[]
  > => {
    const apiBase = process.env.NEXT_PUBLIC_ORB_MODEL!;
    const query =
      selectedSystemId !== null ? `?system_tag_id=${selectedSystemId}` : "";
    const res = await fetch(`${apiBase}/package_counts${query}`);
    const raw = await res.json();

    return raw.map(([start, end, count]: [string, string, number]) => ({
      start,
      end,
      count,
    }));
  }, [selectedSystemId]);

  const fetchAudit = useCallback(async (): Promise<AuditEntry[]> => {
    const apiBase = process.env.NEXT_PUBLIC_ORB_MODEL!;
    const query =
      selectedSystemId !== null ? `?system_tag_id=${selectedSystemId}` : "";
    const res = await fetch(`${apiBase}/audit${query}`);
    return await res.json();
  }, [selectedSystemId]);

  //----------------------------------------------------------------------------
  const packagesState = useDashboardData(fetchPackages, {
    active: activeTab === "packages",
    pollInterval: 30000,
  });

  const packageCountsState = useDashboardData(fetchPackageCounts, {
    active: activeTab === "packages",
    pollInterval: 30000,
  });

  const systemTagsState = useDashboardData(fetchSystemTags, {
    active: activeTab === "tags" || activeTab === "packages",
    pollInterval: 30000,
  });

  //----------------------------------------------------------------------------
  const auditState = useDashboardData(fetchAudit, {
    active: false,
    pollInterval: 0,
  });

  const auditRefresh = auditState.refresh;
  // force refresh when selectedSystemId changes
  useEffect(() => {
    auditRefresh();
  }, [selectedSystemId, auditRefresh]);

  const vulnerablePackageIds = useMemo(() => {
    if (!auditState.data) return new Set<number>();
    return new Set(auditState.data.map((entry) => entry.package_id));
  }, [auditState.data]);

  //----------------------------------------------------------------------------

  const handleSystemTagClick = (id: number) => {
    setHighlightedSystemTagId(id);
    setActiveTab("tags");

    setTimeout(() => {
      document
        .getElementById(`system-tag-${id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });

      setTimeout(() => setHighlightedSystemTagId(null), 3000);
    }, 100);
  };

  const handlePackageClick = (key: string) => {
    setHighlightedPackageKey(key);
    setActiveTab("packages");

    setTimeout(() => {
      document
        .getElementById(`package-${key}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });

      setTimeout(() => setHighlightedPackageKey(null), 3000);
    }, 100);
  };

  // Given a DB package ID
  const handleVulnClick = (id: number) => {
    setHighlightedVulnId(`vuln-pkg-${id}`);
    setActiveTab("vulns");

    setTimeout(() => {
      document
        .getElementById(`vuln-pkg-${id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });

      setTimeout(() => setHighlightedVulnId(null), 3000);
    }, 100);
  };

  //----------------------------------------------------------------------------

  return (
    <div className="flex flex-col min-h-screen font-[family-name:var(--font-geist-sans)] bg-gradient-to-b from-slate-950 to-slate-900">
      {/* Frosted header with sticky tab selector */}
      <header className="sticky top-0 z-10 bg-slate-900/80 backdrop-blur border-b border-slate-700 px-6 py-4">
        <div className="flex gap-4 items-center mb-2">
          <Image
            aria-hidden
            src="/globe.svg"
            alt="Globe icon"
            width={16}
            height={16}
          />
          <p className="font-semibold text-white">fetter</p>
        </div>
        <TabSelector activeTab={activeTab} onTabChange={setActiveTab} />
      </header>

      {/* Main scrollable content */}
      <main className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-4xl mx-auto flex flex-col gap-6">
          {activeTab === "packages" && (
            <>
              <DashboardStatus label="packages" state={packagesState} />

              <SystemTagSelector
                selectedId={selectedSystemId}
                onChange={setSelectedSystemId}
                systemTags={systemTagsState.data ?? undefined}
                packageCount={packagesState.data?.length ?? 0}
                vulnCount={auditState.data?.length ?? 0}
              />

              {packageCountsState.data && (
                <PackageCountsChart data={packageCountsState.data} />
              )}

              <div className="flex flex-col gap-2">
                {packagesState.data?.map((pkg) => (
                  <PackageVersionsCard
                    key={pkg.key}
                    pkg={pkg}
                    onTagClick={handleSystemTagClick}
                    onVulnClick={handleVulnClick}
                    highlight={pkg.key === highlightedPackageKey}
                    vulnerablePackageIds={vulnerablePackageIds}
                  />
                ))}
              </div>
            </>
          )}

          {activeTab === "tags" && (
            <>
              <DashboardStatus label="system tags" state={systemTagsState} />
              <div className="flex flex-col gap-2">
                {systemTagsState.data?.map((tag) => (
                  <SystemTagCard
                    key={tag.id}
                    tag={tag}
                    highlight={tag.id === highlightedSystemTagId}
                    onPackagesClick={(id) => {
                      setSelectedSystemId(id);
                      setActiveTab("packages");
                    }}
                  />
                ))}
              </div>
            </>
          )}

          {activeTab === "allow" && (
            <div className="text-gray-400">Allow list content here</div>
          )}

          {activeTab === "vulns" && (
            <>
              <DashboardStatus label="vulnerabilities" state={auditState} />

              <SystemTagSelector
                selectedId={selectedSystemId}
                onChange={setSelectedSystemId}
                systemTags={systemTagsState.data ?? undefined}
                packageCount={packagesState.data?.length ?? 0}
                vulnCount={auditState.data?.length ?? 0}
              />

              <div className="flex flex-col gap-2">
                {auditState.data?.map((entry) => (
                  <VulnCard
                    key={`vuln-pkg-${entry.package_id}`}
                    record={entry.record}
                    package_id={entry.package_id}
                    highlight={
                      `vuln-pkg-${entry.package_id}` === highlightedVulnId
                    }
                    onPackageClick={handlePackageClick}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </main>

      {/* Sticky footer */}
      <footer className="bg-slate-950 border-t border-slate-700 px-6 py-4">
        <Footer />
      </footer>
    </div>
  );
}
