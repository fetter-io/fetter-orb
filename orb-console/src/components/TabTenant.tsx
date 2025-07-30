"use client";

import { Tenant } from "@/types";
import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { TenantCard } from "@/components/TenantCard";
import { TenantNew } from "@/components/TenantNew";

type TabTenantProps = {
  selectedTenantId: number | null;
};

export function TabTenant({ selectedTenantId }: TabTenantProps) {
  const { data: session, status } = useSession();
  const [tenants, setTenants] = useState<[number, Tenant][]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);

  const fetchTenants = useCallback(async () => {
    if (status !== "authenticated" || !session?.user?.user_id) return;
    try {
      const apiBase = process.env.NEXT_PUBLIC_ORB_MODEL!;
      const res = await fetch(
        `${apiBase}/tenant?user_id=${session.user.user_id}`,
      );
      const data = await res.json();
      const list = Object.values(data) as [number, Tenant][];
      setTenants(list);
    } catch (err) {
      console.error("Failed to fetch tenants:", err);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.user_id, status]);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  if (loading) return <div className="text-gray-400 p-4">Loading tenants…</div>;

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
        {tenants.map(([id, tenant]) => (
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
            fetchTenants();
          }}
          userId={session.user.user_id}
        />
      )}
    </div>
  );
}
