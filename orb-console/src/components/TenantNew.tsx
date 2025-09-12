"use client";

import { useEffect, useState } from "react";
import { UUID } from "@/types";

type NewTenantDialogProps = {
  onClose: () => void;
  onSuccess: () => void;
  userId: UUID;
};

type CountResponse = { count: number }; // used by both /tenant_count and /tenant_limit

export function TenantNew({
  onClose,
  onSuccess,
  userId,
}: NewTenantDialogProps) {
  const [newTenantName, setNewTenantName] = useState("");
  const [creating, setCreating] = useState(false);

  const [count, setCount] = useState<number | null>(null);
  const [limit, setLimit] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const trimmedName = newTenantName.trim();
  const nameValid = /^[a-zA-Z0-9_-]+$/.test(trimmedName);
  const errorMessage =
    newTenantName && !nameValid
      ? "Only letters, numbers, dashes (-), and underscores (_) are allowed."
      : "";

  const apiBase = process.env.NEXT_PUBLIC_ORB_MODEL!;

  // Fetch both count and limit. Return values so callers can use fresh numbers immediately.
  const fetchTenantStatus = async (): Promise<{
    count: number;
    limit: number;
  }> => {
    setLoading(true);
    setErrMsg(null);
    try {
      const [countRes, limitRes] = await Promise.all([
        fetch(`${apiBase}/tenant_count?user_id=${userId}`, {
          cache: "no-store",
        }),
        fetch(`${apiBase}/tenant_limit?user_id=${userId}`, {
          cache: "no-store",
        }),
      ]);

      if (!countRes.ok) throw new Error(`tenant_count HTTP ${countRes.status}`);
      if (!limitRes.ok) throw new Error(`tenant_limit HTTP ${limitRes.status}`);

      const countJson: CountResponse = await countRes.json();
      const limitJson: CountResponse = await limitRes.json();

      setCount(countJson.count);
      setLimit(limitJson.count);

      return { count: countJson.count, limit: limitJson.count };
    } catch (err: unknown) {
      console.error(err);
      setErrMsg("Failed to load tenant status");
      return { count: 0, limit: 2 }; // Provide safe fallbacks
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenantStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const overLimit = count !== null && limit !== null ? count >= limit : false;

  const handleCreate = async () => {
    if (!trimmedName || creating || !nameValid) return;

    setCreating(true);
    try {
      // Re-check count and limit right before creating to avoid races
      const fresh = await fetchTenantStatus();
      if (fresh.count >= fresh.limit) {
        alert(`Tenant limit reached (max ${fresh.limit}).`);
        return;
      }
      const res = await fetch(`${apiBase}/tenant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, user_id: userId }),
      });

      if (!res.ok) throw new Error("Failed to create tenant");

      setNewTenantName("");
      onSuccess();
    } catch (err: unknown) {
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

        {loading ? (
          <p className="text-sm text-zinc-400 mb-3">
            Checking your tenant status…
          </p>
        ) : errMsg ? (
          <p className="text-sm text-red-400 mb-3">{errMsg}</p>
        ) : (
          <div className="mb-3">
            <p className="text-sm text-zinc-300">
              You currently have {count}. Max allowed is {limit}.
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
          disabled={overLimit || loading}
          autoFocus
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              !creating &&
              nameValid &&
              trimmedName &&
              !overLimit &&
              !loading
            ) {
              handleCreate();
            }
            if (e.key === "Escape") {
              onClose();
            }
          }}
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
              !trimmedName || creating || !nameValid || overLimit || loading
            }
            className={`button-entry ${
              !trimmedName || creating || !nameValid || overLimit || loading
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
