"use client";

import { useEffect, useState } from "react";

type Tenant = {
  id: number;
  name: string;
  key: string;
};

export function TabTenant() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTenants() {
      try {
        const res = await fetch("/tenant");
        const data = await res.json();
        const list = Object.values(data) as Tenant[];
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
    <div className="p-4 text-sm text-gray-300">
      <h2 className="text-lg font-semibold mb-2 text-gray-100">Your Tenants</h2>
      <div className="grid gap-2">
        {tenants.map((t) => (
          <div key={t.id} className="border border-slate-700 rounded p-2 bg-slate-800">
            <div><span className="text-gray-400">Name:</span> {t.name}</div>
            <div><span className="text-gray-400">Key:</span> <code className="text-gray-200">{t.key}</code></div>
          </div>
        ))}
      </div>
    </div>
  );
}
