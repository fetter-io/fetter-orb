"use client";

import { useEffect, useState } from "react";

type NewTenantDialogProps = {
  onClose: () => void;
  onSuccess: () => void;
  userId: number;
};

type TenantCountResponse = { count: number };

export function TenantNew({
  onClose,
  onSuccess,
  userId,
}: NewTenantDialogProps) {
  const [newTenantName, setNewTenantName] = useState("");
  const [creating, setCreating] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [countLoading, setCountLoading] = useState(true);
  const [countError, setCountError] = useState<string | null>(null);

  const trimmedName = newTenantName.trim();
  const nameValid = /^[a-zA-Z0-9_-]+$/.test(trimmedName);
  const errorMessage =
    newTenantName && !nameValid
      ? "Only letters, numbers, dashes (-), and underscores (_) are allowed."
      : "";

  const apiBase = process.env.NEXT_PUBLIC_ORB_MODEL!;
  const tenantLimit = 4!;

  const fetchTenantCount = async () => {
    setCountLoading(true);
    setCountError(null);
    try {
      const res = await fetch(`${apiBase}/tenant_count?user_id=${userId}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: TenantCountResponse = await res.json();
      setCount(data.count);
    } catch (err: unknown) {
      console.error(err);
      setCountError("Failed to load current tenant count");
    } finally {
      setCountLoading(false);
    }
  };

  useEffect(() => {
    fetchTenantCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const overLimit = (count ?? 0) >= tenantLimit;

  const handleCreate = async () => {
    if (!trimmedName || creating || !nameValid) return;

    setCreating(true);
    try {
      // Re-check count right before creating to avoid races
      await fetchTenantCount();
      if ((count ?? 0) >= tenantLimit) {
        alert(`Tenant limit reached (max ${tenantLimit}).`);
        return;
      }

      const res = await fetch(`${apiBase}/tenant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, user_id: userId }),
      });

      if (!res.ok) {
        // Optional: read error text for better message
        throw new Error("Failed to create tenant");
      }

      setNewTenantName("");
      onSuccess();
    } catch (err) {
      console.error(err);
      alert("Could not create tenant");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded p-6 shadow-lg w-full max-w-sm">
        <h2 className="text-lg font-semibold text-zinc-100 mb-4">
          Create New Tenant
        </h2>

        {countLoading ? (
          <p className="text-sm text-zinc-400 mb-3">
            Checking your tenant count…
          </p>
        ) : countError ? (
          <p className="text-sm text-red-400 mb-3">{countError}</p>
        ) : (
          <div className="mb-3">
            <p className="text-sm text-zinc-300">
              You currently have {count} {count === 1 ? "tenant" : "tenants"}.
              Max allowed is {tenantLimit}.
            </p>
            {overLimit && (
              <p className="mt-1 text-sm text-amber-300">
                Tenant limit reached.
              </p>
            )}
          </div>
        )}

        <label className="block text-sm text-zinc-400 mb-1">Name</label>
        <input
          type="text"
          value={newTenantName}
          onChange={(e) => setNewTenantName(e.target.value)}
          className="w-full px-3 py-2 text-sm rounded bg-slate-700 text-white border border-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
          disabled={overLimit || countLoading}
        />
        {errorMessage && (
          <p className="mt-1 text-sm text-red-400">{errorMessage}</p>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="button-close">
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={
              !trimmedName ||
              creating ||
              !nameValid ||
              overLimit ||
              countLoading
            }
            className={`button-entry ${
              !trimmedName ||
              creating ||
              !nameValid ||
              overLimit ||
              countLoading
                ? "cursor-not-allowed opacity-40"
                : ""
            }`}
          >
            {creating ? "Creating..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
