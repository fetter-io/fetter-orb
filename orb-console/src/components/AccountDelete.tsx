"use client";

import { signOut, useSession } from "next-auth/react";
import { useState } from "react";

export function AccountDelete() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const handleDelete = async () => {
    if (!session?.user?.user_id) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_ORB_MODEL}/user_delete`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": session.user.user_id.toString(),
          },
          body: JSON.stringify({ user_id: session.user.user_id }),
        },
      );
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err);
      }

      await signOut({ callbackUrl: "/" });
    } catch (err) {
      console.error("Delete failed:", err);
      setError("Failed to delete account.");
    } finally {
      setLoading(false);
      setShowModal(false);
    }
  };

  return (
    <>
      <div className="space-y-2 border border-slate-600 rounded bg-gray-800 p-4">
        <button
          onClick={() => setShowModal(true)}
          disabled={loading}
          className="button-danger"
        >
          Delete Account
        </button>
        {error && <div className="text-xs text-red-400">{error}</div>}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-600 rounded-lg p-6 w-full max-w-md text-sm text-gray-200 shadow-lg space-y-4">
            <h3 className="text-lg font-semibold text-red-400">
              Confirm Account Deletion
            </h3>
            <p>
              Are you sure you want to delete your account? This action is
              permanent and cannot be undone.
            </p>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowModal(false)}
                className="button-close"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="button-danger"
              >
                {loading ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
