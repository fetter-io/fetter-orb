"use client";

import { useState, useEffect } from "react";

type AllowListEditorProps = {
  initialValue: string;
  initialSuperset: boolean;
  initialSubset: boolean;
  tenantId: number;
  onSubmit: (args: [number, string, boolean, boolean]) => Promise<void>;
};

export function AllowListEditor({
  initialValue,
  initialSuperset,
  initialSubset,
  tenantId,
  onSubmit,
}: AllowListEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState({
    value: initialValue,
    superset: initialSuperset,
    subset: initialSubset,
  });

  // If the committed props change while we're NOT editing, keep draft in sync
  useEffect(() => {
    if (!isEditing) {
      setDraft({
        value: initialValue,
        superset: initialSuperset,
        subset: initialSubset,
      });
    }
  }, [initialValue, initialSuperset, initialSubset, isEditing]);

  const [submitting, setSubmitting] = useState(false);
  const [deriving, setDeriving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEditStart = () => {
    // Snapshot current committed props into the draft when entering edit
    setDraft({
      value: initialValue,
      superset: initialSuperset,
      subset: initialSubset,
    });
    setIsEditing(true);
  };

  const handleCancel = () => {
    // Revert draft to the current committed props
    setDraft({
      value: initialValue,
      superset: initialSuperset,
      subset: initialSubset,
    });
    setIsEditing(false);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit([
        tenantId,
        draft.value.trim(),
        draft.superset,
        draft.subset,
      ]);
      // Parent should update props -> component re-renders with new committed values
      setIsEditing(false);
    } catch (err) {
      console.error("Submit error:", err);
      setError("Failed to submit allow list.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDerive = async () => {
    setDeriving(true);
    setError(null);
    try {
      const apiBase = process.env.NEXT_PUBLIC_ORB_MODEL!;
      const response = await fetch(`${apiBase}/dep_manifest_derive?tenant_id=${tenantId}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const derivedPackages: string[] = await response.json();
      const derivedContent = derivedPackages.join('\n');
      setDraft((d) => ({ ...d, value: derivedContent }));
    } catch (err) {
      console.error("Derive error:", err);
      setError("Failed to derive package list.");
    } finally {
      setDeriving(false);
    }
  };

  return (
    <div className="p-2 border border-slate-600 rounded-lg bg-gray-800 shadow-md text-sm text-gray-200 space-y-2">
      <h3 className="text-white font-semibold text-base pl-1">Allow List</h3>

      {!isEditing ? (
        <>
          <div className="flex gap-4 text-xs text-gray-400">
            <div className="flex items-center gap-2">
              <div
                className={`w-4 h-4 border-2 rounded ${
                  initialSuperset
                    ? "bg-green-600 border-green-500"
                    : "bg-slate-700 border-slate-500"
                }`}
              />
              Superset
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`w-4 h-4 border-2 rounded ${
                  initialSubset
                    ? "bg-green-600 border-green-500"
                    : "bg-slate-700 border-slate-500"
                }`}
              />
              Subset
            </div>
          </div>

          <pre className="bg-gray-900 text-gray-500 p-2 rounded max-h-48 overflow-auto whitespace-pre-wrap text-xs">
            {initialValue || "No allow list provided."}
          </pre>

          <button className="button-entry" onClick={handleEditStart}>
            Edit
          </button>
        </>
      ) : (
        <>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={draft.superset}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, superset: e.target.checked }))
                }
                className="w-4 h-4 accent-blue-500 bg-slate-700 border-2 border-slate-500 rounded"
              />
              Allow superset
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={draft.subset}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, subset: e.target.checked }))
                }
                className="w-4 h-4 accent-blue-500 bg-slate-700 border-2 border-slate-500 rounded"
              />
              Allow subset
            </label>
          </div>

          <textarea
            className="w-full p-2 rounded text-sm text-gray-100 bg-slate-900 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={8}
            value={draft.value}
            onChange={(e) => setDraft((d) => ({ ...d, value: e.target.value }))}
            placeholder="Enter a URL or paste full lock file contents"
          />

          <div className="flex justify-between items-center">
            <div className="flex gap-4 items-center">
              <button
                onClick={handleSubmit}
                disabled={submitting || deriving}
                className="button-accept"
              >
                {submitting ? "Submitting..." : "Submit"}
              </button>
              <button onClick={handleCancel} className="button-close">
                Cancel
              </button>
              {error && <p className="text-red-400 text-xs">{error}</p>}
            </div>
            <button
              onClick={handleDerive}
              disabled={submitting || deriving}
              className="button-entry"
            >
              {deriving ? "Deriving..." : "Derive"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
