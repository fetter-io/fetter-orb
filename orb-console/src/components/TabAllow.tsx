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
}: TabAllowProps) {
  // we extract out the ValidationEntry for each category here
  const empty: ValidationEntry[] = [];
  const validationEntries = validationState.data ?? {
    missing: empty,
    unrequired: empty,
    misdefined: empty,
  };

  // this unpacks each package version into a single object that can be looked up by key
  const idToPackage = useMemo(() => {
    if (!packagesState.data)
      return new Map<
        number,
        { name: string; version: string; system_tag_id: number; key: string }
      >();

    const map = new Map<
      number,
      { name: string; version: string; system_tag_id: number; key: string }
    >();
    for (const pkg of packagesState.data) {
      for (const entry of pkg.data) {
        map.set(entry.package_id, {
          name: pkg.name,
          version: entry.version,
          system_tag_id: entry.system_tag_id,
          key: pkg.key,
        });
      }
    }
    return map;
  }, [packagesState.data]);

  // Calculate package counts for use in both chart and panel
  const packageCounts = useMemo(() => {
    const total =
      packagesState.data?.reduce(
        (sum, pkg) => sum + (pkg.data?.length || 0),
        0,
      ) || 0;
    const missing = validationEntries?.missing.length || 0;
    const unrequired = validationEntries?.unrequired.length || 0;
    const misdefined = validationEntries?.misdefined.length || 0;
    const allowed = Math.max(0, total - (unrequired + misdefined));

    return { total, missing, unrequired, misdefined, allowed };
  }, [packagesState.data, validationEntries]);

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
          idToPackage={idToPackage}
        />
      )}
    </>
  );
}
