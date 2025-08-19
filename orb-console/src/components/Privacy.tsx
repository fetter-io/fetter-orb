"use client";

import PrivacyContent from "@/components/PrivacyContent";

type TermsProps = {
  onClose?: () => void;
};

export default function Terms({ onClose }: TermsProps) {
  return (
    <div className="max-w-xl bg-slate-800 rounded p-4 shadow-lg">
      <h1 className="text-xl font-bold mb-2 ml-1">Privacy</h1>
      <PrivacyContent />

      {onClose && (
        <div className="mt-4 text-right">
          <button onClick={onClose} className="button-close">
            Close
          </button>
        </div>
      )}
    </div>
  );
}
