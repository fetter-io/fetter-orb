"use client";

import { Tenant } from "@/types";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { TenantCard } from "@/components/TenantCard";

type TabTenantProps = {
  selectedTenantId: number | null;
};

export function TabTenant({ selectedTenantId }: TabTenantProps) {
  const { data: session, status } = useSession();
  const [tenants, setTenants] = useState<[number, Tenant][]>([]);
  const [loading, setLoading] = useState(true);

  const [showDialog, setShowDialog] = useState(false);
  const [newTenantName, setNewTenantName] = useState("");
  const [creating, setCreating] = useState(false);

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
          <TenantCard key={id} id={id} tenant={tenant} selected={id === selectedTenantId} />
        ))}
      </div>

      {showDialog && (
        <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded p-6 shadow-lg w-full max-w-sm">
            <h2 className="text-lg font-semibold text-zinc-100 mb-4">
              Create New Tenant
            </h2>

            <label className="block text-sm text-zinc-400 mb-1">Name</label>
            <input
              type="text"
              value={newTenantName}
              onChange={(e) => setNewTenantName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded bg-slate-700 text-white border border-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowDialog(false)}
                className="text-sm px-3 py-1 bg-slate-700 text-white rounded hover:bg-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (
                    !newTenantName.trim() ||
                    creating ||
                    !session?.user?.user_id
                  )
                    return;
                  setCreating(true);
                  try {
                    const apiBase = process.env.NEXT_PUBLIC_ORB_MODEL!;
                    const res = await fetch(`${apiBase}/tenant`, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        name: newTenantName,
                        user_id: session.user.user_id,
                      }),
                    });

                    if (!res.ok) throw new Error("Failed to create tenant");

                    setNewTenantName("");
                    setShowDialog(false);
                    fetchTenants(); // refresh list
                  } catch (err) {
                    console.error(err);
                    alert("Could not create tenant");
                  } finally {
                    setCreating(false);
                  }
                }}
                className={`text-sm px-3 py-1 rounded text-white ${
                  creating
                    ? "bg-gray-700 animate-pulse cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-500"
                }`}
              >
                {creating ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
