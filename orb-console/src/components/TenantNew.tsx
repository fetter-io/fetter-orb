"use client";

import { useState } from "react";

type NewTenantDialogProps = {
  onClose: () => void;
  onSuccess: () => void;
  userId: number;
};

export function TenantNew({
  onClose,
  onSuccess,
  userId,
}: NewTenantDialogProps) {
  const [newTenantName, setNewTenantName] = useState("");
  const [creating, setCreating] = useState(false);

  const trimmedName = newTenantName.trim();
  const nameValid = /^[a-zA-Z0-9_-]+$/.test(trimmedName);
  const errorMessage =
    newTenantName && !nameValid
      ? "Only letters, numbers, dashes (-), and underscores (_) are allowed."
      : "";

  const handleCreate = async () => {
    if (!trimmedName || creating || !nameValid) return;
    setCreating(true);

    try {
      const apiBase = process.env.NEXT_PUBLIC_ORB_MODEL!;
      const res = await fetch(`${apiBase}/tenant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, user_id: userId }),
      });

      if (!res.ok) throw new Error("Failed to create tenant");

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

        <label className="block text-sm text-zinc-400 mb-1">Name</label>
        <input
          type="text"
          value={newTenantName}
          onChange={(e) => setNewTenantName(e.target.value)}
          className="w-full px-3 py-2 text-sm rounded bg-slate-700 text-white border border-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {errorMessage && (
          <p className="mt-1 text-sm text-red-400">{errorMessage}</p>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="text-sm px-3 py-1 bg-slate-700 text-white rounded hover:bg-slate-600"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!trimmedName || creating || !nameValid}
            className={`text-sm px-3 py-1 rounded text-white ${
              creating || !nameValid
                ? "bg-gray-700 cursor-not-allowed opacity-60"
                : "bg-blue-600 hover:bg-blue-500"
            }`}
          >
            {creating ? "Creating..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
