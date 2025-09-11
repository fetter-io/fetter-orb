"use client";

import { useState } from "react";
import { UUID } from "@/types";

type TenantRenameDialogProps = {
  tenantId: number;
  currentName: string;
  userId: UUID;
  onClose: () => void;
  onSuccess: () => void;
};

export function TenantRename({
  tenantId,
  currentName,
  userId,
  onClose,
  onSuccess,
}: TenantRenameDialogProps) {
  const [newTenantName, setNewTenantName] = useState(currentName);
  const [renaming, setRenaming] = useState(false);

  const trimmedName = newTenantName.trim();
  const nameValid = /^[a-zA-Z0-9_-]+$/.test(trimmedName);
  const hasChanged = trimmedName !== currentName;
  const errorMessage =
    newTenantName && !nameValid
      ? "Only letters, numbers, dashes (-), and underscores (_) are allowed."
      : "";

  const apiBase = process.env.NEXT_PUBLIC_ORB_MODEL!;

  const handleRename = async () => {
    if (!trimmedName || renaming || !nameValid || !hasChanged) return;

    setRenaming(true);
    try {
      const res = await fetch(`${apiBase}/tenant_rename`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantId,
          user_id: userId,
          name: trimmedName,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => "");
        console.error("Rename failed:", res.status, res.statusText, errorText);
        throw new Error(`Failed to rename tenant: ${res.status} ${res.statusText}`);
      }

      const result = await res.json();
      
      if (result.renamed) {
        onSuccess();
      } else {
        alert(result.reason || "Failed to rename tenant");
      }
    } catch (err: unknown) {
      console.error("Rename error:", err);
      alert(`Could not rename tenant: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setRenaming(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded p-6 shadow-lg w-full max-w-sm">
        <h2 className="text-lg font-semibold text-zinc-100 mb-4">
          Rename Tenant
        </h2>

        <label className="block text-sm text-zinc-400 mb-1">Name</label>
        <input
          type="text"
          value={newTenantName}
          onChange={(e) => setNewTenantName(e.target.value)}
          className="w-full px-3 py-2 text-sm rounded bg-slate-700 text-white border border-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
          disabled={renaming}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter" && !renaming && nameValid && hasChanged) {
              handleRename();
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
            onClick={handleRename}
            disabled={!trimmedName || renaming || !nameValid || !hasChanged}
            className={`button-entry ${
              !trimmedName || renaming || !nameValid || !hasChanged
                ? "cursor-not-allowed opacity-40"
                : ""
            }`}
          >
            {renaming ? "Renaming..." : "Rename"}
          </button>
        </div>
      </div>
    </div>
  );
}