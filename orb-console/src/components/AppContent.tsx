"use client";

// import Image from "next/image";
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
  Tenant,
  ValidationResult,
  ValidationEntry,
} from "@/types";
import { PackageVersionsCard } from "@/components/PackageVersionsCard";
import { SystemTagSelector } from "@/components/SystemTagSelector";
import { PackageCountsChart } from "@/components/PackageCountsChart";
import { VulnCard } from "@/components/VulnCard";
import { TenantSelector } from "@/components/TenantSelector";
import { AllowListEditor } from "@/components/AllowListEditor";
import { Weave } from "@/components/Weave";
import colors from "tailwindcss/colors";
import { ValidationPanel } from "@/components/ValidationPanel";
import { UserMenuDropdown } from "@/components/UserMenuDropdown";

export default function AppContent() {
  const [activeTab, setActiveTab] = useState<Tab>("packages");
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);
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

  const fetchTenants = useCallback(async (): Promise<[number, Tenant][]> => {
    const apiBase = process.env.NEXT_PUBLIC_ORB_MODEL!;
    const res = await fetch(`${apiBase}/tenant`);
    return await res.json(); // assuming it returns [[id, {key, name}], ...]
  }, []);

  const fetchSystemTags = useCallback(async (): Promise<SystemTag[]> => {
    const apiBase = process.env.NEXT_PUBLIC_ORB_MODEL!;
    const query =
      selectedTenantId !== null ? `?tenant_id=${selectedTenantId}` : "";
    const res = await fetch(`${apiBase}/system_tag_pings${query}`);
    const raw = await res.json();
    return raw as SystemTag[];
  }, [selectedTenantId]);

  const fetchPackages = useCallback(async (): Promise<PackageVersions[]> => {
    const apiBase = process.env.NEXT_PUBLIC_ORB_MODEL!;

    const params = new URLSearchParams();
    if (selectedSystemId !== null) {
      params.set("system_tag_id", selectedSystemId.toString());
    }
    if (selectedTenantId !== null) {
      params.set("tenant_id", selectedTenantId.toString());
    }

    const query = params.toString();
    const res = await fetch(
      `${apiBase}/package_versions${query ? `?${query}` : ""}`,
    );
    const raw = await res.json();

    return Object.entries(raw).map(([key, value]) => {
      const casted = value as Omit<PackageVersions, "key">;
      return {
        key,
        name: casted.name,
        data: casted.data,
      };
    });
  }, [selectedSystemId, selectedTenantId]);

  const fetchPackageCounts = useCallback(async (): Promise<
    PackageCountsRecord[]
  > => {
    const apiBase = process.env.NEXT_PUBLIC_ORB_MODEL!;

    const params = new URLSearchParams();
    if (selectedSystemId !== null) {
      params.set("system_tag_id", selectedSystemId.toString());
    }
    if (selectedTenantId !== null) {
      params.set("tenant_id", selectedTenantId.toString());
    }

    const query = params.toString();
    const res = await fetch(
      `${apiBase}/package_counts${query ? `?${query}` : ""}`,
    );
    const raw = await res.json();

    return raw.map(([start, end, count]: [string, string, number]) => ({
      start,
      end,
      count,
    }));
  }, [selectedSystemId, selectedTenantId]);

  const fetchAudit = useCallback(async (): Promise<AuditEntry[]> => {
    const apiBase = process.env.NEXT_PUBLIC_ORB_MODEL!;

    const params = new URLSearchParams();
    if (selectedSystemId !== null) {
      params.set("system_tag_id", selectedSystemId.toString());
    }
    if (selectedTenantId !== null) {
      params.set("tenant_id", selectedTenantId.toString());
    }
    const query = params.toString();
    const res = await fetch(`${apiBase}/audit${query ? `?${query}` : ""}`);

    return await res.json();
  }, [selectedSystemId, selectedTenantId]);

  const fetchValidation = useCallback(async (): Promise<ValidationResult> => {
    const apiBase = process.env.NEXT_PUBLIC_ORB_MODEL!;
    const params = new URLSearchParams();
    if (selectedTenantId !== null) {
      params.set("tenant_id", selectedTenantId.toString());
    }
    if (selectedSystemId !== null) {
      params.set("system_tag_id", selectedSystemId.toString());
    }
    const query = params.toString();
    const res = await fetch(`${apiBase}/validate${query ? `?${query}` : ""}`);

    return await res.json();
  }, [selectedTenantId, selectedSystemId]);

  //----------------------------------------------------------------------------
  const tenantsState = useDashboardData(fetchTenants, {
    active: true,
    pollInterval: 20000,
  });

  const packagesState = useDashboardData(fetchPackages, {
    active: activeTab === "packages",
    pollInterval: 30000,
  });

  const packageCountsState = useDashboardData(fetchPackageCounts, {
    active: activeTab === "packages",
    pollInterval: 30000,
  });

  const systemTagsState = useDashboardData(fetchSystemTags, {
    active: true, // not sure how often to update
    pollInterval: 30000,
  });

  //----------------------------------------------------------------------------
  const validationState = useDashboardData(fetchValidation, {
    active: activeTab === "packages" || activeTab === "allow",
    pollInterval: 0,
  });

  const validationSets = useMemo(() => {
    if (!validationState.data) {
      const empty = new Map<number, string | null>();
      return {
        missing: empty,
        unrequired: empty,
        misdefined: empty,
        undefined: empty,
      };
    }

    const toMap = (entries: ValidationEntry[]) =>
      new Map<number, string | null>(entries);

    const {
      missing,
      unrequired,
      misdefined,
      undefined: undef,
    } = validationState.data;

    return {
      missing: toMap(missing),
      unrequired: toMap(unrequired),
      misdefined: toMap(misdefined),
      undefined: toMap(undef),
    };
  }, [validationState.data]);

  //----------------------------------------------------------------------------
  const auditState = useDashboardData(fetchAudit, {
    active: false,
    pollInterval: 0,
  });

  const auditRefresh = auditState.refresh;
  // force refresh when selectedSystemId changes
  useEffect(() => {
    auditRefresh();
  }, [selectedSystemId, selectedTenantId, auditRefresh]);

  const vulnerablePackageIds = useMemo(() => {
    if (!auditState.data) return new Set<number>();
    return new Set(auditState.data.map((entry) => entry.package_id));
  }, [auditState.data]);

  //----------------------------------------------------------------------------

  const handleSystemTagClick = (id: number) => {
    setHighlightedSystemTagId(id);
    setActiveTab("systems");

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
        <div className="max-w-4xl mx-auto flex flex-col gap-2">
          <div className="flex gap-0 items-center mb-0 items-center justify-center">
            <div className="flex w-16 h-16 ">
              <Weave fill={colors.slate[600]} className="w-full h-full" />
            </div>
          </div>

          <div className="flex justify-between items-center">
            {tenantsState.data && (
              <TenantSelector
                tenants={tenantsState.data}
                selectedId={selectedTenantId}
                onChange={setSelectedTenantId}
              />
            )}
            <UserMenuDropdown />
          </div>

          <TabSelector activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
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

              {packageCountsState.data &&
                packageCountsState.data.length > 0 && (
                  <PackageCountsChart data={packageCountsState.data} />
                )}
              <div className="flex flex-col gap-4">
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

          {activeTab === "allow" && selectedTenantId !== null && (
            <>
              <DashboardStatus label="validation" state={validationState} />

              <SystemTagSelector
                selectedId={selectedSystemId}
                onChange={setSelectedSystemId}
                systemTags={systemTagsState.data ?? undefined}
                packageCount={packagesState.data?.length ?? 0}
                vulnCount={auditState.data?.length ?? 0}
              />

              <AllowListEditor
                key={selectedTenantId} // not sure if this does what we want
                initialValue={validationState.data?.dep_manifest ?? ""}
                tenantId={selectedTenantId}
                onSubmit={async ([tenantId, content]) => {
                  const apiBase = process.env.NEXT_PUBLIC_ORB_MODEL!;
                  const body = JSON.stringify([tenantId, content]);
                  await fetch(`${apiBase}/dep_manifest`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body,
                  });
                  validationState.refresh();
                }}
              />

              {validationState.data && packagesState.data && (
                <ValidationPanel
                  validationSets={validationSets}
                  packages={packagesState.data}
                />
              )}
            </>
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

              <div className="flex flex-col gap-4">
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

          {activeTab === "systems" && (
            <>
              <DashboardStatus label="systems" state={systemTagsState} />

              <div className="flex flex-col gap-4">
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
        </div>
      </main>

      {/* Sticky footer */}
      <footer className="bg-slate-950 border-t border-slate-700 px-6 py-4">
        <Footer />
      </footer>
    </div>
  );
}
