import { ValidationEntry } from "@/types";
import { VulnScoreIcon } from "@/components/VulnScoreIcon";
import { AllowIcon } from "@/components/AllowIcon";
import { PackageVersionInfo } from "@/components/TabAllow";

type ValidationPanelProps = {
  validationEntries: {
    missing: ValidationEntry[];
    unrequired: ValidationEntry[];
    misdefined: ValidationEntry[];
    allowed: ValidationEntry[];
  };
  packageCounts: {
    total: number;
    missing: number;
    unrequired: number;
    misdefined: number;
    allowed: number;
  };
  vulnerablePackageIds?: Map<number, number>;
  onVulnClick?: (packageId: number) => void;
  onPackageClick?: (key: string) => void;
  onSystemTagClick?: (systemTagId: number) => void;
  highlightedAllowStatus?: string | null;
  idToPackage: Map<number, PackageVersionInfo>;
  siteToSystemTag: Map<string, number>;
};

export function ValidationPanel({
  validationEntries,
  packageCounts,
  vulnerablePackageIds,
  onVulnClick,
  onPackageClick,
  onSystemTagClick,
  highlightedAllowStatus,
  idToPackage,
  siteToSystemTag,
}: ValidationPanelProps) {
  const sortEntriesByPackageName = (entries: ValidationEntry[]) => {
    return entries.sort(([idA], [idB]) => {
      const pkgA = idToPackage.get(idA);
      const pkgB = idToPackage.get(idB);
      const nameA = pkgA?.name ?? "Unknown";
      const nameB = pkgB?.name ?? "Unknown";
      const versionA = pkgA?.version ?? "";
      const versionB = pkgB?.version ?? "";

      const nameComparison = nameA.localeCompare(nameB);
      if (nameComparison !== 0) {
        return nameComparison;
      }
      return versionA.localeCompare(versionB);
    });
  };

  const sections = [
    {
      label: "Missing",
      entries: sortEntriesByPackageName(validationEntries.missing),
      count: packageCounts.missing,
    },
    {
      label: "Misdefined",
      entries: sortEntriesByPackageName(validationEntries.misdefined),
      count: packageCounts.misdefined,
    },
    {
      label: "Unrequired",
      entries: sortEntriesByPackageName(validationEntries.unrequired),
      count: packageCounts.unrequired,
    },
    {
      label: "Allowed",
      entries: sortEntriesByPackageName(validationEntries.allowed),
      count: packageCounts.allowed,
    },
  ];

  return (
    <div className="py-2 px-2 border border-slate-600 rounded-lg shadow-sm text-sm w-full text-gray-300 bg-gray-800">
      <h3 className="text-white font-semibold text-base mb-2 ml-1">
        Validation
      </h3>

      <div className="grid grid-cols-1 gap-2">
        {sections.map(({ label, entries, count }) => {
          const isHighlighted = highlightedAllowStatus === label.toLowerCase();
          return (
            <div
              key={label}
              id={`validation-section-${label.toLowerCase()}`}
              className={`border rounded bg-gray-900 overflow-hidden transition-colors duration-1000 ${
                isHighlighted
                  ? "border-blue-500 bg-gray-800"
                  : "border-slate-700"
              }`}
            >
              <div className="px-2 py-2 text-sm font-semibold text-gray-400 flex justify-between items-center">
                <span>
                  {label} ({count})
                </span>
                <AllowIcon
                  status={
                    label.toLowerCase() as
                      | "missing"
                      | "unrequired"
                      | "misdefined"
                      | "allowed"
                  }
                />
              </div>
              <div className="max-h-80 overflow-y-auto">
                <table className="table-fixed w-full text-xs text-left text-gray-400">
                  <thead className="sticky top-0 bg-gray-950 text-gray-500 border-b border-slate-700">
                    <tr>
                      <th className="px-2 py-1 w-2/6">Package</th>
                      <th className="px-2 py-1 w-1/6">Version</th>
                      <th className="px-2 py-1 w-1/6"></th>
                      <th className="px-2 py-1 w-2/6">Sites</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map(([id, ds, site]) => {
                      let displayName: string;
                      let displayVersion: string;
                      let vulnerabilityScore: number;
                      let packageKey: string | null;
                      let canClickPackage: boolean;
                      let systemTagId: number | null;
                      let canClickSite: boolean;

                      if (id === -1) {
                        displayName = ds?.[0] ?? "Unknown";
                        displayVersion = ds?.[1] ?? "—";
                        vulnerabilityScore = 0;
                        packageKey = null;
                        canClickPackage = false;
                        systemTagId = null;
                        canClickSite = false;
                      } else {
                        const pkg = idToPackage.get(id);
                        displayName = pkg?.name ?? "Unknown";
                        displayVersion = pkg?.version ?? "—";
                        vulnerabilityScore = vulnerablePackageIds?.get(id) ?? 0;
                        packageKey = pkg?.key ?? null;
                        canClickPackage = !!packageKey && !!onPackageClick;
                        systemTagId = site
                          ? (siteToSystemTag.get(site) ?? null)
                          : null;
                        canClickSite =
                          !!site && !!systemTagId && !!onSystemTagClick;
                      }

                      return (
                        <tr
                          key={`${label}-${id}-${displayName}-${displayVersion}-${site || "no-site"}`}
                          className="border-b border-slate-800 bg-gray-900 break-all"
                        >
                          <td className="px-2 py-1 truncate">
                            {canClickPackage ? (
                              <button
                                className="text-left hover:text-gray-300 hover:underline cursor-pointer"
                                onClick={() => onPackageClick!(packageKey!)}
                              >
                                {displayName}
                              </button>
                            ) : (
                              displayName
                            )}
                          </td>
                          <td className="px-2 py-1">{displayVersion}</td>
                          <td className="px-2 py-1">
                            {vulnerabilityScore > 0 && onVulnClick ? (
                              <button
                                title="Vulnerability details"
                                className="border-b border-transparent cursor-pointer"
                                onClick={() => onVulnClick(id)}
                              >
                                <VulnScoreIcon score={vulnerabilityScore} />
                              </button>
                            ) : (
                              <VulnScoreIcon score={vulnerabilityScore} />
                            )}
                          </td>
                          <td className="px-2 py-1">
                            {canClickSite ? (
                              <button
                                className="text-left hover:text-gray-300 hover:underline cursor-pointer"
                                onClick={() => onSystemTagClick!(systemTagId!)}
                              >
                                {site}
                              </button>
                            ) : (
                              (site ?? "—")
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
