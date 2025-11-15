import { useState } from "react";
import Terms from "@/components/Terms";
import Privacy from "@/components/Privacy";

export function Footer() {
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  return (
    <>
      <footer className="grid grid-cols-6 gap-4 text-gray-500 text-sm">
        {/* Empty first column for spacing */}
        <div></div>

        {/* Column 2: Link to org */}
        <div className="flex justify-center">
          <a
            className="flex gap-2 hover:text-gray-400"
            href="https://github.com/fetter-io"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </div>

        {/* Column 3: Link to docs */}
        <div className="flex justify-center">
          <a className="flex gap-2 hover:text-gray-400" href="/docs">
            Docs
          </a>
        </div>

        {/* Column 4: Internal link to terms */}
        <div className="flex justify-center">
          <button
            onClick={() => setShowTerms(true)}
            className="cursor-pointer hover:text-gray-400"
          >
            Terms
          </button>
        </div>

        {/* Column 5: privacy */}
        <div className="flex justify-center">
          <button
            onClick={() => setShowPrivacy(true)}
            className="cursor-pointer hover:text-gray-400"
          >
            Privacy
          </button>
        </div>

        {/* Empty spacing */}
        <div></div>
      </footer>

      {showTerms && (
        <div className="fixed inset-0 bg-slate-900/80 flex items-center justify-center z-50">
          <Terms readOnly onClose={() => setShowTerms(false)} />
        </div>
      )}
      {showPrivacy && (
        <div className="fixed inset-0 bg-slate-900/80 flex items-center justify-center z-50">
          <Privacy onClose={() => setShowPrivacy(false)} />
        </div>
      )}
    </>
  );
}
