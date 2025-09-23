import { useState } from "react";
import { VulnRecord, CvssDetail } from "@/types";
import { VulnScoreIcon } from "@/components/VulnScoreIcon";
import { CollapseButton } from "@/components/CollapseButton";

// Given CVSS details, return a div with a formatted link.
const processCvssDetails = (cvssDetails: CvssDetail[], vulnId: string) => {
  return cvssDetails
    .sort((a, b) => {
      // Extract version numbers for sorting (V4_0 -> 4, V3_1 -> 3.1, etc.)
      const getVersionNumber = (version: string) => {
        const match = version.match(/V(\d+)_(\d+)/);
        if (!match) return 0;
        return parseFloat(`${match[1]}.${match[2]}`);
      };
      return getVersionNumber(b.version) - getVersionNumber(a.version);
    })
    .map((cvss, i) => {
      const version = cvss.version.toUpperCase(); // Normalize for consistency
      let baseUrl = null;

      if (version === "V4_0") {
        baseUrl = "https://www.first.org/cvss/calculator/4-0#";
      } else if (version === "V3_1" || version === "V3_0") {
        baseUrl = "https://www.first.org/cvss/calculator/3-1#";
      } else if (version === "V2_0") {
        baseUrl = "https://www.first.org/cvss/calculator/2-0#";
      }

      const href = baseUrl ? `${baseUrl}${cvss.vector}` : null;

      return (
        <div
          key={`${vulnId}-cvss-${i}`}
          className="text-slate-400 hover:underline break-all px-2 py-1 text-sm flex items-center gap-1"
        >
          <VulnScoreIcon score={cvss.score} />
          <span>
            (
            {cvss.severity.charAt(0).toUpperCase() +
              cvss.severity.slice(1).toLowerCase()}
            ):{" "}
          </span>
          {href ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:underline break-all"
            >
              {cvss.vector}
            </a>
          ) : (
            <span>{cvss.vector}</span>
          )}
        </div>
      );
    });
};

type VulnCardProps = {
  record: VulnRecord;
  package_id: number;
  highlight?: boolean;
  onPackageClick?: (key: string) => void;
  vulnerabilityScore: number;
  isExpanded: boolean;
  onToggle: (isExpanded: boolean) => void;
};

export function VulnCard({
  record,
  package_id,
  highlight,
  onPackageClick,
  vulnerabilityScore,
  isExpanded,
  onToggle,
}: VulnCardProps) {
  const { package: pkg, vuln_ids, vuln_infos } = record;

  return (
    <div
      id={`vuln-pkg-${package_id}`}
      className={`p-2 mb-4 border rounded-sm bg-gray-900 shadow-md text-sm text-gray-200 space-y-2 transition-colors duration-1000
        ${
          highlight
            ? "border-blue-500 bg-gray-700"
            : "border-slate-600 bg-gray-800"
        }`}
    >
      <div className="flex items-center pr-1">
        <div className="flex items-center gap-2 w-5/6">
          <CollapseButton
            isExpanded={isExpanded}
            onToggle={() => onToggle(!isExpanded)}
            className="ml-2"
          />
          <h3 className="text-white font-semibold text-base truncate">
            {pkg.name}
          </h3>
          <span className="text-gray-400 text-sm">{pkg.version}</span>
          <button
            title="Package details"
            className="border-b border-transparent hover:border-blue-400 cursor-pointer"
            onClick={() => onPackageClick?.(pkg.key)}
          >
            📦
          </button>
        </div>
        <div className="w-1/6 flex justify-end">
          <VulnScoreIcon score={vulnerabilityScore} />
        </div>
      </div>

      {isExpanded &&
        vuln_ids.map((id) => {
          const vuln = vuln_infos[id];
          if (!vuln) return null;

          return (
            <div key={id} className="border-t border-slate-700 pt-2 space-y-2">
              <p className="font-semibold text-slate-400">
                <a
                  href={`https://osv.dev/vulnerability/${vuln.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  {vuln.id}
                </a>
              </p>

              {vuln.summary && <p className="text-gray-400">{vuln.summary}</p>}

              <div className="text-xs text-gray-400 space-y-1">
                {vuln.cvss_details && vuln.cvss_details.length > 0 && (
                  <div className="mt-1">
                    <span className="text-gray-400 text-sm font-semibold block mb-1">
                      CVSS Details
                    </span>
                    <div className="grid grid-cols-1 bg-slate-800 rounded-md overflow-hidden divide-y divide-slate-700">
                      {processCvssDetails(vuln.cvss_details, id)}
                    </div>
                  </div>
                )}

                {vuln.references.length > 0 && (
                  <div className="mt-1">
                    <span className="text-gray-400 text-sm font-semibold block mb-1">
                      References
                    </span>
                    {/* NOTE: want to use use this, but cannot get last row always full width: divide-y divide-slate-700 */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 bg-slate-800 rounded-md overflow-hidden">
                      {vuln.references.map((ref, i) => {
                        let hostname = "";
                        try {
                          hostname = new URL(ref.url).hostname.replace(
                            /^www\./,
                            "",
                          );
                        } catch {
                          hostname = "invalid.url";
                        }

                        const label = `${ref.type.charAt(0).toUpperCase()}${ref.type.slice(1).toLowerCase()} (${hostname})`;

                        return (
                          <a
                            key={`${id}-ref-${i}`}
                            href={ref.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-400 hover:underline break-all px-2 py-1 text-sm"
                          >
                            {label}
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
    </div>
  );
}
