"use client";

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
            className="button-close"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
