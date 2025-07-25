"use client";

import { useEffect, useState } from "react";

type Tenant = {
  name: string;
  key: string;
};

export function TabTenant() {
  const [tenants, setTenants] = useState<[number, Tenant][]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTenants() {
      try {
        const apiBase = process.env.NEXT_PUBLIC_ORB_MODEL!;
        const res = await fetch(`${apiBase}/tenant`);
        const data = await res.json();

        // data is Record<string, [id, tenant]>
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
    <div className="gap-4 text-sm text-gray-300">
      <h2 className="text-lg font-semibold mb-2 text-gray-100">Tenants</h2>

      <div className="grid gap-4">
        {tenants.map(([id, tenant]) => (
          <div key={id} className="border border-slate-700 rounded-lg p-2 bg-slate-800">
            <div><span className="text-gray-400">Name:</span> {tenant.name}</div>
            <div><span className="text-gray-400">Key:</span> <code className="text-gray-200 break-all">{tenant.key}</code></div>
          </div>
        ))}
      </div>
    </div>
  );
}
