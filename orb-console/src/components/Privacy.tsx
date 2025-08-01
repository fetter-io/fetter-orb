"use client";

import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import PrivacyContent from "@/components/PrivacyContent";

type TermsProps = {
  onClose?: () => void;
};

export default function Terms({ onClose }: TermsProps) {
  return (
    <div className="max-w-2xl bg-slate-800 rounded p-6 shadow-lg">
      <h1 className="text-2xl font-bold mb-4">Privacy</h1>
      <PrivacyContent />

      {onClose && (
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
}
