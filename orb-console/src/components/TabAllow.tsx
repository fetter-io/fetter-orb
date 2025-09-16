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
}: TabAllowProps) {
  const empty: ValidationEntry[] = [];
  const validationSets = validationState.data ?? {
    missing: empty,
    unrequired: empty,
    misdefined: empty,
    undefined: empty,
  };

  const idToPackage = useMemo(() => {
    if (!packagesState.data)
      return new Map<number, { name: string; version: string }>();

    const map = new Map<number, { name: string; version: string }>();
    for (const pkg of packagesState.data) {
      for (const entry of pkg.data) {
        map.set(entry.package_id, {
          name: pkg.name,
          version: entry.version,
        });
      }
    }
    return map;
  }, [packagesState.data]);

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
          <ValidationChart
            packages={packagesState.data}
            validationSets={validationSets}
          />
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
          validationSets={validationSets}
          vulnerablePackageIds={vulnerablePackageIds}
          onVulnClick={onVulnClick}
          idToPackage={idToPackage}
        />
      )}
    </>
  );
}
