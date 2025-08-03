"use client";

import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import TermsContent from "@/components/TermsContent";

type TermsProps = {
  onAccepted?: () => void;
  readOnly?: boolean;
  onClose?: () => void;
};

export default function Terms({
  onAccepted,
  readOnly = false,
  onClose,
}: TermsProps) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);

  const acceptTerms = async () => {
    if (!session?.user?.user_id) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_ORB_MODEL}/user_terms`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: session.user.user_id }),
        },
      );

      if (res.ok) {
        onAccepted?.();
      } else {
        console.error("Failed to accept terms");
      }
    } catch (err) {
      console.error("Error accepting terms:", err);
    } finally {
      setLoading(false);
    }
  };

  const declineTerms = () => {
    signOut({ callbackUrl: "/" });
  };

  const Content = (
    <div className="max-w-2xl bg-slate-800 rounded p-6 shadow-lg">
      <h1 className="text-2xl font-bold mb-4">Terms and Conditions</h1>
      <TermsContent />

      {!readOnly && (
        <div className="flex justify-end gap-4">
          <button
            onClick={declineTerms}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Decline
          </button>
          <button
            onClick={acceptTerms}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            disabled={loading}
          >
            {loading ? "Accepting..." : "Accept"}
          </button>
        </div>
      )}

      {readOnly && onClose && (
        <div className="mt-6 text-right">
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white px-3 py-2 border border-gray-600 rounded"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );

  return readOnly ? (
    Content
  ) : (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-gray-200 p-6">
      {Content}
    </div>
  );
}
