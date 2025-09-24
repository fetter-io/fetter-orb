import { PackageVersions } from "@/types";
import { VulnScoreIcon } from "@/components/VulnScoreIcon";
import { AllowIcon } from "@/components/AllowIcon";
import { CollapseButton } from "@/components/CollapseButton";

type PackageVersionsCardProps = {
  pkg: PackageVersions;
  onTagClick?: (systemTagId: number) => void;
  onVulnClick?: (packageId: number) => void;
  highlight?: boolean;
  vulnerablePackageIds?: Map<number, number>;
  validationSets?: {
    unrequired: Set<number>;
    misdefined: Set<number>;
  };
  onAllowClick?: (status: string) => void;
  isExpanded: boolean;
  onToggle: (isExpanded: boolean) => void;
};
// ...
export function PackageVersionsCard({
  pkg,
  onTagClick,
  onVulnClick,
  highlight,
  vulnerablePackageIds,
  validationSets,
  onAllowClick,
  isExpanded,
  onToggle,
}: PackageVersionsCardProps) {
  // Determine unique validation statuses for this package
  const uniqueValidationStatuses = validationSets
    ? (() => {
        const statuses = new Set<string>();

        pkg.data.forEach((entry) => {
          if (validationSets.misdefined.has(entry.package_id)) {
            statuses.add("misdefined");
          } else if (validationSets.unrequired.has(entry.package_id)) {
            statuses.add("unrequired");
          } else {
            statuses.add("allowed");
          }
        });

        return Array.from(statuses);
      })()
    : [];

  // Determine unique vulnerability scores for this package
  const uniqueVulnScores = vulnerablePackageIds
    ? (() => {
        const scores = new Set<number>();

        pkg.data.forEach((entry) => {
          const score = vulnerablePackageIds.get(entry.package_id);
          if (score && score > 0) {
            scores.add(score);
          }
        });

        return Array.from(scores).sort((a, b) => b - a); // Sort descending (highest first)
      })()
    : [];

  return (
    <div
      id={`package-${pkg.key}`}
      className={`p-2 mb-2 border rounded-sm shadow-md text-sm w-full transition-colors duration-1000
      ${highlight ? "border-blue-500 bg-gray-800" : "border-slate-600 bg-gray-800"}`}
    >
      <div className="flex items-center pr-1">
        <h3 className="font-bold text-white flex items-center gap-2 w-5/6">
          <CollapseButton
            isExpanded={isExpanded}
            onToggle={() => onToggle(!isExpanded)}
            className="ml-0"
          />
          <span className="truncate">{pkg.name}</span>
          {uniqueValidationStatuses.length > 0 && (
            <div className="flex gap-2 ml-0">
              {uniqueValidationStatuses.map((status) => (
                <AllowIcon
                  key={status}
                  status={status as "allowed" | "unrequired" | "misdefined"}
                  {...(onAllowClick && { onAllowClick })}
                />
              ))}
            </div>
          )}
        </h3>
        <div className="w-1/6 flex justify-end gap-1">
          {uniqueVulnScores.map((score) => (
            <button
              key={score}
              title="Vulnerability details"
              className="border-b border-transparent cursor-pointer"
              onClick={() => {
                // Find the first package_id with this score and trigger onVulnClick
                const entry = pkg.data.find(
                  (e) => vulnerablePackageIds?.get(e.package_id) === score,
                );
                if (entry) {
                  onVulnClick?.(entry.package_id);
                }
              }}
            >
              <VulnScoreIcon score={score} />
            </button>
          ))}
        </div>
      </div>
      {isExpanded && (
        <div
          className="mt-2 border-t border-slate-700"
          aria-label={`${pkg.name} versions`}
        >
          <table className="w-full text-xs text-left text-gray-400 table-fixed">
            <thead className="sticky top-0 bg-gray-950 text-gray-500 border-b border-slate-700">
              <tr>
                <th className="px-2 py-1 w-1/6">Version</th>
                <th className="px-2 py-1 w-1/12"></th>
                <th className="px-2 py-1 w-1/12"></th>
                <th className="px-2 py-1 w-2/6">Sites</th>
                <th className="px-2 py-1 w-2/6">System</th>
              </tr>
            </thead>
            <tbody>
              {pkg.data.map((entry, index) => {
                const vulnerabilityScore =
                  vulnerablePackageIds?.get(entry.package_id) ?? 0;
                const isVulnerable = vulnerabilityScore > 0;

                return (
                  <tr
                    key={index}
                    className="border-b border-slate-800 bg-gray-900"
                  >
                    <td className="px-2 py-1 whitespace-nowrap truncate">
                      <a
                        href={`https://pypi.org/project/${pkg.key}/${entry.version}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        {entry.version}
                      </a>
                    </td>
                    <td className="px-2 py-1 truncate">
                      <span className="inline-flex items-center gap-x-2">
                        {validationSets && (
                          <AllowIcon
                            packageId={entry.package_id}
                            validationSets={validationSets}
                            {...(onAllowClick && { onAllowClick })}
                          />
                        )}
                      </span>
                    </td>

                    <td className="px-2 py-1 truncate">
                      <span className="inline-flex items-center gap-x-2">
                        {isVulnerable && (
                          <button
                            title="Vulnerability details"
                            className="border-b border-transparent cursor-pointer"
                            onClick={() => onVulnClick?.(entry.package_id)}
                          >
                            <VulnScoreIcon score={vulnerabilityScore} />
                          </button>
                        )}
                      </span>
                    </td>
                    <td className="px-2 py-1 break-all">{entry.path}</td>
                    <td className="px-2 py-1 break-all">
                      {entry.system_tag_username &&
                        entry.system_tag_hostname && (
                          <button
                            className="hover:text-gray-300 hover:underline cursor-pointer"
                            onClick={() => onTagClick?.(entry.system_tag_id)}
                          >
                            {entry.system_tag_username}:{" "}
                            {entry.system_tag_hostname}
                          </button>
                        )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
