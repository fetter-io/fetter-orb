"use client";

import { useSession } from "next-auth/react";
import { Tenant } from "@/types";
import { useState } from "react";
import { TenantCard } from "@/components/TenantCard";
import { TenantNew } from "@/components/TenantNew";

type TabTenantProps = {
  selectedTenantId: number | null;
  tenantsState: {
    data: [number, Tenant][] | null;
    refresh: () => void;
  };
};

export function TabTenant({ selectedTenantId, tenantsState }: TabTenantProps) {
  const { data: session } = useSession();
  const [showDialog, setShowDialog] = useState(false);

  if (tenantsState.loading)
    return <div className="text-gray-400 p-4">Loading tenants…</div>;

  return (
    <div className="gap-4 text-gray-300">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-zinc-200">Tenants</h2>
        <button
          onClick={() => setShowDialog(true)}
          className="text-sm rounded-full px-2 py-1 border border-slate-600 transition-colors duration-200
            text-zinc-400 hover:text-zinc-300 bg-gray-800 hover:bg-gray-600"
          aria-label="Add Tenant"
          title="Add Tenant"
        >
          <span className="inline-block">＋</span>
        </button>
      </div>

      <div className="grid gap-4">
        {tenantsState.data?.map(([id, tenant]) => (
          <TenantCard
            key={id}
            tenant={tenant}
            selected={id === selectedTenantId}
          />
        ))}
      </div>

      {showDialog && session?.user?.user_id && (
        <TenantNew
          onClose={() => setShowDialog(false)}
          onSuccess={() => {
            setShowDialog(false);
            tenantsState.refresh();
          }}
          userId={session.user.user_id}
        />
      )}
    </div>
  );
}
