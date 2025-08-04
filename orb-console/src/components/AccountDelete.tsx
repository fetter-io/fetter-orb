"use client";

import { signOut, useSession } from "next-auth/react";
import { useState } from "react";

export function AccountDelete() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!session?.user?.user_id) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete your account? This cannot be undone."
    );
    if (!confirmed) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_ORB_MODEL}/user_delete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": session.user.user_id.toString(),
        },
        body: JSON.stringify({ user_id: session.user.user_id }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err);
      }

      // Success — log out and redirect
      await signOut({ callbackUrl: "/" });
    } catch (err) {
      console.error("Delete failed:", err);
      setError("Failed to delete account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={handleDelete}
        disabled={loading}
        className="text-sm px-4 py-2 rounded bg-red-700 text-white hover:bg-red-600 disabled:opacity-50"
      >
        {loading ? "Deleting..." : "Delete Account"}
      </button>
      {error && <div className="text-xs text-red-400">{error}</div>}
    </div>
  );
}
