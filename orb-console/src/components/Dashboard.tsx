"use client";

// import Image from "next/image";
import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useSession } from "next-auth/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Footer } from "@/components/Footer";
import { useDashboardData } from "@/hooks/useDashboardData";
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
} from "@/types";
import { TenantSelector } from "@/components/TenantSelector";
import { TabTenant } from "@/components/TabTenant";
import { TabAccount } from "@/components/TabAccount";
import { TabVulns } from "@/components/TabVulns";
import { TabPackages } from "@/components/TabPackages";
import { TabAllow } from "@/components/TabAllow";
import { TabSystems } from "@/components/TabSystems";
import { Weave } from "@/components/Weave";
import colors from "tailwindcss/colors";
import { UserMenuDropdown } from "@/components/UserMenuDropdown";
import { getPackageVulnerabilityScore } from "@/utils/vulnerabilityScore";

const DEFAULT_TAB: Tab = "packages";

const isValidTab = (value: string | null): value is Tab =>
  value === "packages" ||
  value === "systems" ||
  value === "allow" ||
  value === "vulns" ||
  value === "tenant" ||
  value === "account";

const getTabFromParam = (param: string | null): Tab =>
  isValidTab(param) ? param : DEFAULT_TAB;

//------------------------------------------------------------------------------

//------------------------------------------------------------------------------

export default function Dashboard() {
  // NOTE: the dashboard is called after the /on_login endpoint is called and the session is created. Thus, the user has been created and they hae at least on tenant.

  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams?.toString() ?? "";
  const tabParam = searchParams?.get("tab") ?? null;
  const packageParam = searchParams?.get("package") ?? null;
  // package query param from external navigation (e.g., from /lookup)
  const handledPackageParam = useRef<string | null>(null);

  //----------------------------------------------------------------------------
  // states

  const [activeTab, setActiveTabState] = useState<Tab>(() =>
    getTabFromParam(tabParam),
  );

  // const [activeTab, setActiveTab] = useState<Tab>("packages");

  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);
  const [selectedSystemId, setSelectedSystemId] = useState<number | null>(null);
  const [highlightedSystemTagId, setHighlightedSystemTagId] = useState<
    number | null
  >(null);
  const [highlightedPackageKey, setHighlightedPackageKey] = useState<
    string | null
  >(null);
  const [highlightedAllowStatus, setHighlightedAllowStatus] = useState<
    string | null
  >(null);
  const [highlightedVulnId, setHighlightedVulnId] = useState<string | null>(
    null,
  );
  // Two-layer filtering: chart-based filtering + display filtering for handleSystemTagClick
  const [filteredSystemsForDisplay, setFilteredSystemsForDisplay] = useState<
    SystemTag[] | null
  >(null);
  // Chart-based filtering (first layer) - renamed from filteredSystems for clarity
  const [chartFilteredSystems, setChartFilteredSystems] = useState<
    SystemTag[] | null
  >(null);

  // Final filtered systems (second layer)
  const filteredSystems = useMemo(() => {
    // If we have a display filter, use that; otherwise use chart-filtered systems
    return filteredSystemsForDisplay || chartFilteredSystems;
  }, [filteredSystemsForDisplay, chartFilteredSystems]);
  const [minVulnScore, setMinVulnScore] = useState<number>(0);
  const [maxVulnScore, setMaxVulnScore] = useState<number>(10);
  const [packageSearchTerm, setPackageSearchTerm] = useState<string>("");

  const [userInfo, setUserInfo] = useState<UserRecord | null>(null);

  const [lastAuditTime, setLastAuditTime] = useState<number | null>(null);
  const [lastPackageDataHash, setLastPackageDataHash] = useState<string | null>(
    null,
  );

  // Track expanded state for VulnCards by package_id
  const [expandedVulnCards, setExpandedVulnCards] = useState<Set<number>>(
    new Set(),
  );

  const handleVulnCardToggle = useCallback(
    (packageId: number, isExpanded: boolean) => {
      setExpandedVulnCards((prev) => {
        const newSet = new Set(prev);
        if (isExpanded) {
          newSet.add(packageId);
        } else {
          newSet.delete(packageId);
        }
        return newSet;
      });
    },
    [],
  );

  // Track expanded state for PackageVersionsCards by package key
  const [expandedPackageCards, setExpandedPackageCards] = useState<Set<string>>(
    new Set(),
  );

  const handlePackageCardToggle = useCallback(
    (packageKey: string, isExpanded: boolean) => {
      setExpandedPackageCards((prev) => {
        const newSet = new Set(prev);
        if (isExpanded) {
          newSet.add(packageKey);
        } else {
          newSet.delete(packageKey);
        }
        return newSet;
      });
    },
    [],
  );

  // Two-layer filtering: search-based filtering + display filtering for handlePackageClick
  const [filteredPackagesForDisplay, setFilteredPackagesForDisplay] = useState<
    PackageVersions[] | null
  >(null);

  // Two-layer filtering: score-based filtering + display filtering for handleVulnClick
  const [filteredVulnsForDisplay, setFilteredVulnsForDisplay] = useState<
    AuditEntry[] | null
  >(null);

  //----------------------------------------------------------------------------
  // tab management, URL updating

  // keeps internal state consistent with the live URL
  useEffect(() => {
    const currentTab = getTabFromParam(tabParam);
    setActiveTabState((prev) => (prev === currentTab ? prev : currentTab));

    if (tabParam && !isValidTab(tabParam)) {
      const params = new URLSearchParams(searchParamsString);
      params.delete("tab");
      const queryString = params.toString();
      const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
      if (newUrl) {
        // replace does not add to browser history
        router.replace(newUrl, { scroll: false });
      }
    }
  }, [tabParam, searchParamsString, pathname, router]);

  // switch tabs: update state, update URL
  const setActiveTab = useCallback(
    (tab: Tab) => {
      const currentTab = getTabFromParam(tabParam);
      if (currentTab === tab) {
        return;
      }
      // NOTE: not necessary to call setActiveTabState, as it will be done by the useEffect above on router change.
      // setActiveTabState((prev) => (prev === tab ? prev : tab));

      const params = new URLSearchParams(searchParamsString);
      if (tab === DEFAULT_TAB) {
        params.delete("tab");
      } else {
        params.set("tab", tab);
      }
      const queryString = params.toString();
      const newUrl = queryString ? `${pathname}?${queryString}` : pathname;

      if (newUrl) {
        router.push(newUrl, { scroll: false });
      }
    },
    [pathname, router, searchParamsString, tabParam],
  );

  //----------------------------------------------------------------------------

  useEffect(() => {
    const fetchUser = async () => {
      if (!session?.user?.user_id || userInfo) return;

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_ORB_MODEL}/user?user_id=${session.user.user_id}`,
      );
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.error(
          "Failed to fetch user info",
          res.status,
          res.statusText,
          txt,
        );
        return;
      }
      const data = await res.json();
      setUserInfo(data);
    };

    fetchUser();
  }, [session?.user?.user_id, userInfo]);

  //----------------------------------------------------------------------------
  // core fetch functions

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

  //----------------------------------------------------------------------------
  // Validation state and related routines

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

  // Create validationSets derived from validationState
  const validationSets = useMemo(() => {
    if (!validationState.data) {
      return {
        unrequired: new Set<number>(),
        misdefined: new Set<number>(),
      };
    }
    const unrequiredSet = new Set<number>();
    const misdefinedSet = new Set<number>();

    validationState.data.unrequired.forEach(([packageId]) => {
      unrequiredSet.add(packageId);
    });
    validationState.data.misdefined.forEach(([packageId]) => {
      misdefinedSet.add(packageId);
    });

    return {
      unrequired: unrequiredSet,
      misdefined: misdefinedSet,
    };
  }, [validationState.data]);

  //----------------------------------------------------------------------------
  // auditState

  // Create a hash of package data to detect changes
  const currentPackageDataHash = useMemo(() => {
    if (!packagesState.data) return null;
    return JSON.stringify(
      packagesState.data.map((pkg) => ({
        key: pkg.key,
        versions: pkg.data.map((entry) => entry.version).sort(),
      })),
    );
  }, [packagesState.data]);

  // Check if audit should run based on data changes or time elapsed
  const shouldAuditUpdate = useMemo(() => {
    if (activeTab !== "vulns") return false;

    if (lastAuditTime === null) return true;
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000; // 5 minutes
    const timeSinceLastAudit = now - lastAuditTime;

    if (timeSinceLastAudit >= fiveMinutes) return true;
    if (currentPackageDataHash !== lastPackageDataHash) return true;
    return false;
  }, [activeTab, currentPackageDataHash, lastPackageDataHash, lastAuditTime]);

  const shouldAudit =
    selectedTenantId !== null &&
    tenantsState.loading === false &&
    systemTagsState.loading === false &&
    packagesState.loading === false &&
    shouldAuditUpdate;

  const auditState = useDashboardData(fetchAudit, {
    active: activeTab === "vulns" && shouldAudit,
    pollInterval: 0,
  });

  // Update tracking state when audit completes
  useEffect(() => {
    if (auditState.data && !auditState.loading) {
      setLastAuditTime(Date.now());
      setLastPackageDataHash(currentPackageDataHash);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auditState.data]);

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
  // Audit updates

  const vulnerablePackageIds = useMemo(() => {
    if (!auditState.data) return new Map<number, number>();
    const scoreMap = new Map<number, number>();

    auditState.data.forEach((entry) => {
      const { score } = getPackageVulnerabilityScore(entry.record);
      scoreMap.set(entry.package_id, score);
    });

    return scoreMap;
  }, [auditState.data]);

  // Score-based filtering (first layer)
  const scoreFilteredAuditData = useMemo(() => {
    if (!auditState.data) return [];

    return auditState.data.filter((entry) => {
      const score = vulnerablePackageIds.get(entry.package_id) || 0;
      return score >= minVulnScore && score <= maxVulnScore;
    });
  }, [auditState.data, vulnerablePackageIds, minVulnScore, maxVulnScore]);

  // Final filtered audit data (second layer)
  const filteredAuditData = useMemo(() => {
    // If we have a display filter, use that; otherwise use score-filtered audit data
    return filteredVulnsForDisplay || scoreFilteredAuditData;
  }, [filteredVulnsForDisplay, scoreFilteredAuditData]);

  // Search-based filtering (first layer)
  const searchFilteredPackages = useMemo(() => {
    if (!packagesState.data) {
      return [];
    }

    if (!packageSearchTerm.trim()) {
      return packagesState.data;
    }

    const lowerSearchTerm = packageSearchTerm.toLowerCase();
    return packagesState.data.filter((pkg) =>
      pkg.name.toLowerCase().includes(lowerSearchTerm),
    );
  }, [packagesState.data, packageSearchTerm]);

  // Final filtered packages (second layer)
  const filteredPackages = useMemo(() => {
    // If we have a display filter, use that; otherwise use search-filtered packages
    return filteredPackagesForDisplay || searchFilteredPackages;
  }, [filteredPackagesForDisplay, searchFilteredPackages]);

  //----------------------------------------------------------------------------
  // These methods support on click actions that change the currently active tab

  const handleSystemTagClick = (id: number) => {
    setHighlightedSystemTagId(id);
    setActiveTab("systems");

    // Filter to show only the target system by id (exact match)
    const targetSystem = systemTagsState.data?.find(
      (system) => system.id === id,
    );
    if (targetSystem) {
      setFilteredSystemsForDisplay([targetSystem]);
    }
    // Clear chart-based filter since we're showing a specific system
    setChartFilteredSystems(null);

    // Scroll to top of the window to ensure the filtered system is visible
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
      setTimeout(() => {
        setHighlightedSystemTagId(null);
      }, 2000);
    }, 100);
  };

  const handlePackageClick = useCallback(
    (key: string) => {
      setHighlightedPackageKey(key);
      setActiveTab("packages");

      // Expand the target package
      setExpandedPackageCards((prev) => {
        const newSet = new Set(prev);
        newSet.add(key);
        return newSet;
      });

      // Filter to show only the target package by key (exact match)
      const targetPackage = packagesState.data?.find((pkg) => pkg.key === key);
      if (targetPackage) {
        setFilteredPackagesForDisplay([targetPackage]);
      }
      // Clear any existing search term since we're showing a specific package
      setPackageSearchTerm("");

      // Scroll to top of the window to ensure the filtered package is visible
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
        setTimeout(() => {
          setHighlightedPackageKey(null);
        }, 2000);
      }, 100);
    },
    [packagesState.data, setActiveTab],
  );

  useEffect(() => {
    if (
      packageParam &&
      packagesState.data &&
      handledPackageParam.current !== packageParam
    ) {
      handledPackageParam.current = packageParam;
      handlePackageClick(packageParam);

      // Remove the package param from URL after handling
      const params = new URLSearchParams(searchParamsString);
      params.delete("package");
      const queryString = params.toString();
      const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
      if (newUrl) {
        router.replace(newUrl, { scroll: false });
      }
    }
  }, [
    packageParam,
    packagesState.data,
    handlePackageClick,
    searchParamsString,
    pathname,
    router,
  ]);

  const handleVulnClick = (id: number) => {
    setHighlightedVulnId(`vuln-pkg-${id}`);
    setActiveTab("vulns");

    // Expand the target vulnerability card
    setExpandedVulnCards((prev) => {
      const newSet = new Set(prev);
      newSet.add(id);
      return newSet;
    });

    // Filter to show only the target vulnerability by package_id (exact match)
    const targetVuln = auditState.data?.find(
      (entry) => entry.package_id === id,
    );
    if (targetVuln) {
      setFilteredVulnsForDisplay([targetVuln]);
    }
    // Reset score filters since we're showing a specific vulnerability
    setMinVulnScore(0);
    setMaxVulnScore(10);

    // Scroll to top of the window to ensure the filtered vulnerability is visible
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
      setTimeout(() => {
        setHighlightedVulnId(null);
      }, 2000);
    }, 100);
  };

  const handleAllowClick = (status: string) => {
    setHighlightedAllowStatus(status);
    setActiveTab("allow");

    setTimeout(() => {
      document
        .getElementById(`validation-section-${status}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });

      setTimeout(() => setHighlightedAllowStatus(null), 5000);
    }, 100);
  };

  //----------------------------------------------------------------------------

  // Calculate if current user can modify system active state
  const canModifySystemActive = useMemo(() => {
    if (!userInfo || !selectedTenantId || !tenantsState.data) return true;

    // get pair of id, Tenant
    const selectedTenant = tenantsState.data.find(
      ([id]) => id === selectedTenantId,
    );
    // if selectedTenant is empty default to true
    return selectedTenant ? selectedTenant[1].created_by === userInfo.id : true;
  }, [userInfo, selectedTenantId, tenantsState.data]);

  //----------------------------------------------------------------------------

  return (
    <div className="flex flex-col min-h-screen font-[family-name:var(--font-geist-sans)] bg-gradient-to-b from-slate-950 to-slate-900">
      {/* Frosted header with sticky tab selector */}
      <header className="sticky top-0 z-10 bg-slate-900/80 backdrop-blur border-b border-slate-700 px-6 pt-3 pb-0">
        <div className="max-w-4xl mx-auto flex flex-col gap-1">
          <div className="relative flex items-center justify-between w-full mb-0">
            <div className="flex-shrink-0">
              {tenantsState.data && (
                <TenantSelector
                  tenants={tenantsState.data}
                  selectedId={selectedTenantId}
                  onChange={setSelectedTenantId}
                />
              )}
            </div>
            <div className="absolute left-1/2 transform -translate-x-1/2 flex w-12 h-12">
              <Weave fill={colors.slate[600]} className="w-full h-full" />
            </div>
            <div className="flex-shrink-0">
              <UserMenuDropdown />
            </div>
          </div>

          <TabSelector activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
      </header>

      {/* Main scrollable content */}
      <main className="flex-1 overflow-y-auto px-6 py-4 pb-12">
        <div className="max-w-4xl mx-auto flex flex-col gap-4">
          {activeTab === "packages" && (
            <TabPackages
              packagesState={packagesState}
              packageCountsState={packageCountsState}
              systemTagsState={systemTagsState}
              auditState={auditState}
              selectedSystemId={selectedSystemId}
              setSelectedSystemId={setSelectedSystemId}
              highlightedPackageKey={highlightedPackageKey}
              vulnerablePackageIds={vulnerablePackageIds}
              validationSets={validationSets}
              onSystemTagClick={handleSystemTagClick}
              onVulnClick={handleVulnClick}
              onAllowClick={handleAllowClick}
              filteredPackages={filteredPackages}
              packageSearchTerm={packageSearchTerm}
              setPackageSearchTerm={setPackageSearchTerm}
              filteredPackagesForDisplay={filteredPackagesForDisplay}
              setFilteredPackagesForDisplay={setFilteredPackagesForDisplay}
              expandedPackageCards={expandedPackageCards}
              onPackageCardToggle={handlePackageCardToggle}
            />
          )}

          {activeTab === "vulns" && (
            <TabVulns
              auditState={auditState}
              selectedSystemId={selectedSystemId}
              setSelectedSystemId={setSelectedSystemId}
              systemTagsState={systemTagsState}
              packagesState={packagesState}
              highlightedVulnId={highlightedVulnId}
              onPackageClick={handlePackageClick}
              filteredAuditData={filteredAuditData}
              filteredVulnsForDisplay={filteredVulnsForDisplay}
              setFilteredVulnsForDisplay={setFilteredVulnsForDisplay}
              vulnerablePackageIds={vulnerablePackageIds}
              minVulnScore={minVulnScore}
              maxVulnScore={maxVulnScore}
              setMinVulnScore={setMinVulnScore}
              setMaxVulnScore={setMaxVulnScore}
              expandedVulnCards={expandedVulnCards}
              onVulnCardToggle={handleVulnCardToggle}
            />
          )}

          {activeTab === "allow" && selectedTenantId !== null && (
            <TabAllow
              validationState={validationState}
              packagesState={packagesState}
              systemTagsState={systemTagsState}
              auditState={auditState}
              selectedSystemId={selectedSystemId}
              setSelectedSystemId={setSelectedSystemId}
              selectedTenantId={selectedTenantId}
              userId={session?.user?.user_id || ""}
              vulnerablePackageIds={vulnerablePackageIds}
              onVulnClick={handleVulnClick}
              onPackageClick={handlePackageClick}
              onSystemTagClick={handleSystemTagClick}
              highlightedAllowStatus={highlightedAllowStatus}
              onAllowClick={handleAllowClick}
            />
          )}

          {activeTab === "systems" && (
            <TabSystems
              systemTagsState={systemTagsState}
              highlightedSystemTagId={highlightedSystemTagId}
              onPackagesClick={setSelectedSystemId}
              setActiveTab={setActiveTab}
              filteredSystems={filteredSystems}
              chartFilteredSystems={chartFilteredSystems}
              setChartFilteredSystems={setChartFilteredSystems}
              filteredSystemsForDisplay={filteredSystemsForDisplay}
              setFilteredSystemsForDisplay={setFilteredSystemsForDisplay}
              onSystemActiveChange={(id, active) => {
                systemTagsState.refresh();
                if (!active && id === selectedSystemId) {
                  setSelectedSystemId(null);
                }
              }}
              canModifySystemActive={canModifySystemActive}
            />
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

      {/* Fixed footer */}
      <footer className="fixed bottom-0 left-0 right-0 z-10 bg-slate-950 border-t border-slate-700 px-6 py-2">
        <Footer />
      </footer>
    </div>
  );
}
