"use client";

import { useMemo } from "react";
import { SystemTagSelector } from "@/components/SystemTagSelector";
import { DashboardStatus } from "@/components/DashboardStatus";
import { AllowListEditor } from "@/components/AllowListEditor";
import { ValidationPanel } from "@/components/ValidationPanel";
import { ValidationChart } from "@/components/ValidationChart";
import {
  SystemTag,
  PackageVersions,
  AuditEntry,
  ValidationResult,
  ValidationEntry,
} from "@/types";
import { DataState } from "@/hooks/useDashboardData";

export type PackageVersionInfo = {
  name: string;
  version: string;
  key: string;
  sites: string[];
};

interface TabAllowProps {
  validationState: DataState<ValidationResult>;
  packagesState: DataState<PackageVersions[]>;
  systemTagsState: DataState<SystemTag[]>;
  auditState: DataState<AuditEntry[]>;
  selectedSystemId: number | null;
  setSelectedSystemId: (id: number | null) => void;
  selectedTenantId: number;
  userId: string;
  vulnerablePackageIds: Map<number, number>;
  onVulnClick: (packageId: number) => void;
  onPackageClick: (key: string) => void;
  onSystemTagClick: (systemTagId: number) => void;
  highlightedAllowStatus: string | null;
}

export function TabAllow({
  validationState,
  packagesState,
  systemTagsState,
  auditState,
  selectedSystemId,
  setSelectedSystemId,
  selectedTenantId,
  userId,
  vulnerablePackageIds,
  onVulnClick,
  onPackageClick,
  onSystemTagClick,
  highlightedAllowStatus,
}: TabAllowProps) {
  // we extract out the ValidationEntry for each category here
  const baseValidationEntries = useMemo(() => {
    const empty: ValidationEntry[] = [];
    return (
      validationState.data ?? {
        missing: empty,
        unrequired: empty,
        misdefined: empty,
      }
    );
  }, [validationState.data]);

  // this unpacks each package-version into a single object that can be looked up by key; this only takes the first package-version-site encountered
  const { idToPackage, siteToSystemTag } = useMemo(() => {
    if (!packagesState.data) {
      return {
        idToPackage: new Map<number, PackageVersionInfo>(),
        siteToSystemTag: new Map<string, number>(),
      };
    }

    const idToPackageMap = new Map<number, PackageVersionInfo>();
    const siteToSystemTagMap = new Map<string, number>();

    for (const pkg of packagesState.data) {
      for (const entry of pkg.data) {
        // Build siteToSystemTag mapping
        siteToSystemTagMap.set(entry.path, entry.system_tag_id);

        // Build idToPackage mapping
        if (idToPackageMap.has(entry.package_id)) {
          idToPackageMap.get(entry.package_id)?.sites.push(entry.path);
          continue;
        }
        idToPackageMap.set(entry.package_id, {
          name: pkg.name,
          version: entry.version,
          key: pkg.key,
          sites: [entry.path],
        });
      }
    }

    return {
      idToPackage: idToPackageMap,
      siteToSystemTag: siteToSystemTagMap,
    };
  }, [packagesState.data]);

  // Calculate allowed entries by finding all package IDs not in unrequired or misdefined
  const allowedEntries = useMemo(() => {
    if (!packagesState.data) return [];

    const unrequiredIds = new Set(
      baseValidationEntries.unrequired.map(([id]) => id),
    );
    const misdefinedIds = new Set(
      baseValidationEntries.misdefined.map(([id]) => id),
    );

    const allowed: ValidationEntry[] = [];
    for (const [packageId, pvi] of idToPackage.entries()) {
      if (!unrequiredIds.has(packageId) && !misdefinedIds.has(packageId)) {
        pvi.sites.forEach((site) => {
          allowed.push([packageId, null, site]);
        });
      }
    }
    return allowed;
  }, [packagesState.data, baseValidationEntries, idToPackage]);

  const validationEntries = useMemo(
    () => ({
      ...baseValidationEntries,
      allowed: allowedEntries,
    }),
    [baseValidationEntries, allowedEntries],
  );

  // Calculate package counts for use in both chart and panel
  const packageCounts = useMemo(() => {
    // get total package-version-site
    const total =
      packagesState.data?.reduce(
        (sum, pkg) => sum + (pkg.data?.length || 0),
        0,
      ) || 0;
    // these lengths are package-version-site
    const missing = validationEntries?.missing.length || 0;
    const unrequired = validationEntries?.unrequired.length || 0;
    const misdefined = validationEntries?.misdefined.length || 0;
    const allowed = validationEntries?.allowed.length || 0;

    return { total, missing, unrequired, misdefined, allowed };
  }, [validationEntries, packagesState.data]);

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
          <DashboardStatus label="validation" state={validationState} />
        </div>
      </div>

      {validationState.data &&
        packagesState.data &&
        packagesState.data.length > 0 && (
          <ValidationChart packageCounts={packageCounts} />
        )}

      <AllowListEditor
        key={selectedTenantId} // not sure if this does what we want
        initialValue={validationState.data?.dep_manifest ?? ""}
        initialSuperset={validationState.data?.superset ?? false}
        initialSubset={validationState.data?.subset ?? false}
        tenantId={selectedTenantId}
        onSubmit={async ([tenantId, content, superset, subset]) => {
          const apiBase = process.env.NEXT_PUBLIC_ORB_MODEL!;
          const body = JSON.stringify({
            user_id: userId,
            tenant_id: tenantId,
            content: content,
            superset: superset,
            subset: subset,
          });
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
          validationEntries={validationEntries}
          packageCounts={packageCounts}
          vulnerablePackageIds={vulnerablePackageIds}
          onVulnClick={onVulnClick}
          onPackageClick={onPackageClick}
          onSystemTagClick={onSystemTagClick}
          highlightedAllowStatus={highlightedAllowStatus}
          idToPackage={idToPackage}
          siteToSystemTag={siteToSystemTag}
        />
      )}
    </>
  );
}
