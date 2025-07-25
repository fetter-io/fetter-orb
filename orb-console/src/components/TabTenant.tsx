"use client";

import { Tenant } from "@/types";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { IconLinux } from "@/components/IconLinux";
import { IconApple } from "@/components/IconApple";

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
  }, [session?.user?.user_id, status]);

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
            <div className="text-xl font-semibold text-zinc-400 mb-2">
              Tenant: {tenant.name}
            </div>

            <div>
              <h3 className="text-zinc-300 text-sm">Updates per day</h3>
              <code className="text-zinc-400 text-sm break-all">
                {tenant.ping_limit}
              </code>
            </div>

            <div>
              <h3 className="text-zinc-300 text-sm">Key</h3>
              <code className="text-zinc-400 text-sm break-all">
                {tenant.key}
              </code>
            </div>

            <div className="mt-4 bg-slate-900 p-4">
              <h2 className="text-zinc-300 font-semibold">
                Upload with the{" "}
                <a
                  href="https://github.com/fetter-io/fetter-rs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-400"
                >
                  Fetter
                </a>{" "}
                CLI
              </h2>

              <code className="text-zinc-400 text-xs break-all">
                fetter monitor-scan --url http://localhost:3001/monitor_scan
                --tenant {tenant.key}
              </code>
            </div>

            <div className="mt-4 bg-slate-900 p-4">
              <h2 className="text-zinc-300 font-semibold">
                Upload with the Fetter Agent
              </h2>

              <div className="flex gap-4 mt-2">
                <button
                  disabled
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-700 rounded opacity-50 cursor-not-allowed"
                >
                  <IconLinux />
                  Ubuntu Installer
                </button>

                <button
                  disabled
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-700 rounded opacity-50 cursor-not-allowed"
                >
                  <IconApple />
                  Mac Installer
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
