"use client";

import { Tenant } from "@/types";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type TabTenantProps = {
  selectedTenantId: number | null;
};

export function TabTenant({ selectedTenantId }: TabTenantProps) {
  const { data: session, status } = useSession();
  const [tenants, setTenants] = useState<[number, Tenant][]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTenants() {
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
    }

    fetchTenants();
  }, []);

  if (loading) return <div className="text-gray-400 p-4">Loading tenants…</div>;

  return (
    <div className="gap-4 text-gray-300">
      <div className="grid gap-4">
        {tenants.map(([id, tenant]) => (
          <div
            key={id}
            className={`border rounded p-4 bg-slate-800 ${
              id === selectedTenantId ? "border-blue-500" : "border-slate-600"
            }`}
          >
            <div className="text-xl font-semibold text-gray-400 mb-2">
              Tenant: {tenant.name}
            </div>
            <div>
              <span className="text-gray-400 text-sm">Key:</span>{" "}
              <code className="text-gray-200 text-sm break-all">
                {tenant.key}
              </code>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
