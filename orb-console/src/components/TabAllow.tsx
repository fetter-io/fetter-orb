"use client";

import { useMemo } from "react";
import { SystemTagSelector } from "@/components/SystemTagSelector";
import { DashboardStatus } from "@/components/DashboardStatus";
import { AllowListEditor } from "@/components/AllowListEditor";
import { ValidationPanel } from "@/components/ValidationPanel";
import {
  SystemTag,
  PackageVersions,
  AuditEntry,
  ValidationResult,
  ValidationEntry,
} from "@/types";

interface DataState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  lastFetched: Date | null;
  refresh: () => void;
}

interface TabAllowProps {
  validationState: DataState<ValidationResult>;
  packagesState: DataState<PackageVersions[]>;
  systemTagsState: DataState<SystemTag[]>;
  auditState: DataState<AuditEntry[]>;
  selectedSystemId: number | null;
  setSelectedSystemId: (id: number | null) => void;
  selectedTenantId: number;
}

export function TabAllow({
  validationState,
  packagesState,
  systemTagsState,
  auditState,
  selectedSystemId,
  setSelectedSystemId,
  selectedTenantId,
}: TabAllowProps) {
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
  );
}
