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
  const [value, setValue] = useState(initialValue);
  const [editValue, setEditValue] = useState(initialValue);
  const [superset, setSuperset] = useState(initialSuperset);
  const [subset, setSubset] = useState(initialSubset);
  const [editSuperset, setEditSuperset] = useState(initialSuperset);
  const [editSubset, setEditSubset] = useState(initialSubset);

  useEffect(() => {
    setValue(initialValue);
    setEditValue(initialValue);
    setSuperset(initialSuperset);
    setSubset(initialSubset);
    setEditSuperset(initialSuperset);
    setEditSubset(initialSubset);
  }, [initialValue, initialSuperset, initialSubset]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit([tenantId, editValue.trim(), editSuperset, editSubset]);
      setValue(editValue.trim());
      setSuperset(editSuperset);
      setSubset(editSubset);
      setIsEditing(false);
    } catch (err) {
      console.error("Submit error:", err);
      setError("Failed to submit allow list.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-2 border border-slate-600 rounded-lg bg-gray-800 shadow-md text-sm text-gray-200 space-y-2">
      <h3 className="text-white font-semibold text-base pl-1">Allow List</h3>

      {!isEditing ? (
        <>
          <div className="flex gap-4 text-xs text-gray-400">
            <div className="flex items-center gap-2">
              <div className={`w-4 h-4 border-2 rounded flex items-center justify-center text-xs ${
                superset
                  ? "bg-green-600 border-green-500 text-white"
                  : "bg-slate-700 border-slate-500 text-gray-500"
              }`}>
              </div>
              Superset
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-4 h-4 border-2 rounded flex items-center justify-center text-xs ${
                subset
                  ? "bg-green-600 border-green-500 text-white"
                  : "bg-slate-700 border-slate-500 text-gray-500"
              }`}>
              </div>
              Subset
            </div>
          </div>

          <pre className="bg-gray-900 text-gray-500 p-2 rounded max-h-48 overflow-auto whitespace-pre-wrap text-xs">
            {value || "No allow list provided."}
          </pre>

          <button className="button-entry" onClick={() => {
            setEditSuperset(superset);
            setEditSubset(subset);
            setIsEditing(true);
          }}>
            Edit
          </button>
        </>
      ) : (
        <>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={editSuperset}
                onChange={(e) => setEditSuperset(e.target.checked)}
                className="w-4 h-4 accent-blue-500 bg-slate-700 border-2 border-slate-500 rounded"
              />
              Allow superset
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={editSubset}
                onChange={(e) => setEditSubset(e.target.checked)}
                className="w-4 h-4 accent-blue-500 bg-slate-700 border-2 border-slate-500 rounded"
              />
              Allow subset
            </label>
          </div>

          <textarea
            className="w-full p-2 rounded text-sm text-gray-100 bg-slate-900 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={8}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            placeholder="Enter a URL or paste full lock file contents"
          />
          <div className="flex gap-4 items-center">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="button-accept"
            >
              {submitting ? "Submitting..." : "Submit"}
            </button>
            <button
              onClick={() => {
                setEditValue(value);
                setEditSuperset(superset);
                setEditSubset(subset);
                setIsEditing(false);
              }}
              className="button-close"
            >
              Cancel
            </button>
            {error && <p className="text-red-400 text-xs">{error}</p>}
          </div>
        </>
      )}
    </div>
  );
}
