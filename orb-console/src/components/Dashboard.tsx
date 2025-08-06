"use client";

// import Image from "next/image";
import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useSession } from "next-auth/react";

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
  UserRecord,
  ValidationResult,
  ValidationEntry,
} from "@/types";
import { PackageVersionsCard } from "@/components/PackageVersionsCard";
import { SystemTagSelector } from "@/components/SystemTagSelector";
import { PackageCountsChart } from "@/components/PackageCountsChart";
import { VulnCard } from "@/components/VulnCard";
import { TenantSelector } from "@/components/TenantSelector";
import { TabTenant } from "@/components/TabTenant";
import { TabAccount } from "@/components/TabAccount";
import { AllowListEditor } from "@/components/AllowListEditor";
import { Weave } from "@/components/Weave";
import colors from "tailwindcss/colors";
import { ValidationPanel } from "@/components/ValidationPanel";
import { UserMenuDropdown } from "@/components/UserMenuDropdown";

//------------------------------------------------------------------------------

export default function Dashboard() {
  // NOTE: the dashboard is called after the /on_login endpoint is called and the session is created. Thus, the user has been created and they hae at least on tenant.

  const { data: session, status } = useSession();

  //----------------------------------------------------------------------------
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

  //----------------------------------------------------------------------------
  const [userInfo, setUserInfo] = useState<UserRecord | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      if (!session?.user?.user_id || userInfo) return;

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_ORB_MODEL}/user?user_id=${session.user.user_id}`,
      );
      if (!res.ok) {
        console.error("Failed to fetch user info");
        return;
      }
      const data = await res.json();
      setUserInfo(data);
    };

    fetchUser();
  }, [session?.user?.user_id, userInfo]);

  //----------------------------------------------------------------------------

  const fetchTenants = useCallback(async (): Promise<[number, Tenant][]> => {
    if (status !== "authenticated" || !session?.user?.user_id) return [];

    const apiBase = process.env.NEXT_PUBLIC_ORB_MODEL!;
    const res = await fetch(
      `${apiBase}/tenant?user_id=${session.user.user_id}`,
    );
    return await res.json(); // assuming it returns [[id, {key, name}], ...]
  }, [session?.user?.user_id, status]);

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
  // All applications of useDashboardData

  const tenantsState = useDashboardData(fetchTenants, {
    active: true,
    pollInterval: 30000,
  });

  const systemTagsState = useDashboardData(fetchSystemTags, {
    active: true, // not sure how often to update
    pollInterval: 30000,
  });

  // Only fetch packages after tenant selected and system tag is loaded
  const shouldFetchPackages =
    selectedTenantId !== null &&
    tenantsState.loading === false &&
    systemTagsState.loading === false;

  const packagesState = useDashboardData(fetchPackages, {
    active: activeTab === "packages" && shouldFetchPackages,
    pollInterval: 30000,
  });

  const packageCountsState = useDashboardData(fetchPackageCounts, {
    active: activeTab === "packages" && shouldFetchPackages,
    pollInterval: 30000,
  });

  // Update packages when selectedTenantId, selectedSystemId change
  const packagesStateRefresh = packagesState.refresh;
  const packageCountsStateRefresh = packageCountsState.refresh;

  useEffect(() => {
    if (!shouldFetchPackages) return;
    packagesStateRefresh();
    packageCountsStateRefresh();
  }, [
    selectedTenantId,
    selectedSystemId,
    packagesStateRefresh,
    packageCountsStateRefresh,
    shouldFetchPackages,
  ]);

  const shouldValidate =
    selectedTenantId !== null &&
    tenantsState.loading === false &&
    systemTagsState.loading === false &&
    packagesState.loading === false;

  const validationState = useDashboardData(fetchValidation, {
    active:
      (activeTab === "packages" || activeTab === "allow") && shouldValidate,
    pollInterval: 0,
  });

  const shouldAudit =
    selectedTenantId !== null &&
    tenantsState.loading === false &&
    systemTagsState.loading === false &&
    packagesState.loading === false;

  const auditState = useDashboardData(fetchAudit, {
    active: activeTab === "vulns" && shouldAudit,
    pollInterval: 0,
  });

  //----------------------------------------------------------------------------
  // Tenant state and related routines

  const hasSetInitialTenant = useRef(false);

  // Load last-selected tenant on first load of tenants
  useEffect(() => {
    if (!tenantsState.data || hasSetInitialTenant.current) return;

    fetch(
      `${process.env.NEXT_PUBLIC_ORB_MODEL}/user_tenant_last?user_id=${session?.user?.user_id}`,
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.tenant_id != null) {
          setSelectedTenantId(data.tenant_id);
          hasSetInitialTenant.current = true;
        }
      })
      .catch((err) => console.error("Failed to load last tenant", err));
  }, [tenantsState.data, session?.user?.user_id]);

  // Send update to backend when user tenant changes.
  useEffect(() => {
    if (!hasSetInitialTenant.current) return; // skip initial
    if (selectedTenantId == null) return;

    // Reset system ID first
    setSelectedSystemId(null);

    fetch(`${process.env.NEXT_PUBLIC_ORB_MODEL}/user_tenant_last`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: session?.user?.user_id,
        tenant_id: selectedTenantId,
      }),
    }).catch((err) => console.error("Failed to save last tenant", err));
  }, [selectedTenantId, session?.user?.user_id]);

  //----------------------------------------------------------------------------
  // Validation state and related routines

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
  // Audit updates

  const vulnerablePackageIds = useMemo(() => {
    if (!auditState.data) return new Set<number>();
    return new Set(auditState.data.map((entry) => entry.package_id));
  }, [auditState.data]);

  //----------------------------------------------------------------------------
  // These methods support on click actions that change the currently active tab

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

          {activeTab === "tenant" && (
            <TabTenant
              selectedTenantId={selectedTenantId}
              tenantsState={tenantsState}
            />
          )}

          {activeTab === "account" && <TabAccount userInfo={userInfo} />}
        </div>
      </main>

      {/* Sticky footer */}
      <footer className="bg-slate-950 border-t border-slate-700 px-6 py-4">
        <Footer />
      </footer>
    </div>
  );
}
