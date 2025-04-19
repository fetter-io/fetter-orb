"use client";

import { useState, useEffect } from "react";

type AllowListEditorProps = {
  initialValue: string;
  tenantId: number;
  onSubmit: (args: [number, string]) => Promise<void>;
};

export function AllowListEditor({
  initialValue,
  tenantId,
  onSubmit,
}: AllowListEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialValue);
  const [editValue, setEditValue] = useState(initialValue);

  useEffect(() => {
    if (!isEditing) {
      setValue(initialValue);
      setEditValue(initialValue);
    }
  }, [initialValue, isEditing]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit([tenantId, editValue.trim()]);
      setValue(editValue.trim());
      setIsEditing(false);
    } catch (err) {
      console.error("Submit error:", err);
      setError("Failed to submit allow list.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 border border-slate-600 rounded-lg bg-gray-800 shadow-md text-sm text-gray-200 space-y-2">
      <h3 className="text-white font-semibold text-base">Allow List</h3>

      {!isEditing ? (
        <>
          <pre className="bg-gray-900 text-gray-500 p-2 rounded max-h-48 overflow-auto whitespace-pre-wrap text-xs">
            {value || "No allow list provided."}
          </pre>
          <button
            className="text-sm rounded px-2 py-1 border border-slate-600 bg-gray-800 text-zinc-400 hover:bg-gray-700 hover:text-zinc-300 transition"
            onClick={() => setIsEditing(true)}
          >
            Edit
          </button>
        </>
      ) : (
        <>
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
              className="text-sm rounded px-2 py-1 border border-slate-600 bg-slate-900 text-white  hover:bg-blue-700 "
            >
              {submitting ? "Submitting..." : "Submit"}
            </button>
            <button
              onClick={() => {
                setEditValue(value);
                setIsEditing(false);
              }}
              className="text-sm rounded px-2 py-1 border border-slate-600 bg-gray-800 text-zinc-400 hover:bg-gray-700 hover:text-zinc-300 transition"
            >
              Cancel
            </button>
            {error && <p className="text-red-500 text-xs">{error}</p>}
          </div>
        </>
      )}
    </div>
  );
}
