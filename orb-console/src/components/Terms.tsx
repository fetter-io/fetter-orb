"use client";

import { useState } from "react";
import { signOut, useSession } from "next-auth/react";

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
        onAccepted();
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
      <div className="text-sm max-h-120 overflow-y-auto px-4 mb-6 flex flex-col space-y-4">
        <p>No Warranty.</p>
        <p>
          Disclaimer. THE SOFTWARE AND ALL OTHER Fetter OFFERINGS ARE PROVIDED
          “AS-IS” AND WITHOUT WARRANTY OF ANY KIND. Fetter AND ITS AFFILIATES
          DISCLAIM ALL OTHER WARRANTIES, WHETHER EXPRESS, IMPLIED, STATUTORY OR
          OTHERWISE. TO THE MAXIMUM EXTENT PERMITTED UNDER APPLICABLE LAW,
          Fetter AND ITS AFFILIATES AND SUPPLIERS SPECIFICALLY DISCLAIM ALL
          IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
          PURPOSE, TITLE, AND NON-INFRINGEMENT WITH RESPECT TO THE SOFTWARE AND
          ALL OTHER Fetter OFFERINGS. THERE IS NO WARRANTY THAT THE SOFTWARE OR
          ANY OTHER Fetter OFFERINGS WILL BE ERROR FREE, OR THAT THEY WILL
          OPERATE WITHOUT INTERRUPTION OR WILL FULFILL ANY OF SOFTWARE USER’S
          PARTICULAR PURPOSES OR NEEDS. THE SOFTWARE AND ALL OTHER Fetter
          OFFERINGS ARE NOT FAULT-TOLERANT AND ARE NOT DESIGNED OR INTENDED FOR
          USE IN ANY HAZARDOUS ENVIRONMENT REQUIRING FAIL-SAFE PERFORMANCE OR
          OPERATION. NEITHER THE SOFTWARE OR ANY OTHER Fetter OFFERINGS ARE FOR
          USE IN THE OPERATION OF AIRCRAFT NAVIGATION, NUCLEAR FACILITIES,
          COMMUNICATION SYSTEMS, WEAPONS SYSTEMS, DIRECT OR INDIRECT
          LIFE-SUPPORT SYSTEMS, AIR TRAFFIC CONTROL, OR ANY APPLICATION OR
          INSTALLATION WHERE FAILURE COULD RESULT IN DEATH, SEVERE PHYSICAL
          INJURY, OR PROPERTY DAMAGE. SOFTWARE USER AGREES THAT IT IS SOFTWARE
          USER’S RESPONSIBILITY TO ENSURE SAFE USE OF SOFTWARE AND ANY OTHER
          Fetter OFFERING IN SUCH APPLICATIONS AND INSTALLATIONS. Fetter DOES
          NOT WARRANT ANY THIRD PARTY PRODUCTS OR SERVICES.
        </p>
        <p>
          6.2 No Guarantee. SOFTWARE USER ACKNOWLEDGES, UNDERSTANDS, AND AGREES
          THAT Fetter DOES NOT GUARANTEE OR WARRANT THAT IT WILL FIND, LOCATE,
          DISCOVER, PREVENT OR WARN OF, ALL OF SOFTWARE USER’S OR ITS
          AFFILIATES’ SYSTEM THREATS, VULNERABILITIES, MALWARE, AND MALICIOUS
          SOFTWARE, AND SOFTWARE USER AND ITS AFFILIATES WILL NOT HOLD Fetter
          RESPONSIBLE THEREFOR.
        </p>
        <p>
          7. Limitation of Liability. TO THE MAXIMUM EXTENT PERMITTED BY
          APPLICABLE LAW Fetter SHALL NOT BE LIABLE TO SOFTWARE USER (UNDER ANY
          THEORY OF LIABILITY, WHETHER IN CONTRACT, STATUTE, TORT OR OTHERWISE)
          FOR: (A) ANY LOST PROFITS, REVENUE, OR SAVINGS, LOST BUSINESS
          OPPORTUNITIES, LOST DATA, OR SPECIAL, INCIDENTAL, CONSEQUENTIAL, OR
          PUNITIVE DAMAGES, EVEN IF Fetter HAS BEEN ADVISED OF THE POSSIBILITY
          OF SUCH DAMAGES OR LOSSES OR SUCH DAMAGES OR LOSSES WERE REASONABLY
          FORESEEABLE; OR (B) AN AMOUNT THAT EXCEEDS IN THE AGGREGATE $100.
          THESE LIMITATIONS WILL APPLY NOTWITHSTANDING ANY FAILURE OF ESSENTIAL
          PURPOSE OF ANY REMEDY SPECIFIED IN THESE TERMS. MULTIPLE CLAIMS SHALL
          NOT EXPAND THE LIMITATIONS SPECIFIED IN THIS SECTION 7.
        </p>
      </div>

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
