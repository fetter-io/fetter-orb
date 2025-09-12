import { PackageVersions } from "@/types";
import { VulnScoreIcon } from "@/components/VulnScoreIcon";

type PackageVersionsCardProps = {
  pkg: PackageVersions;
  onTagClick?: (systemTagId: number) => void;
  onVulnClick?: (packageId: number) => void;
  highlight?: boolean;
  vulnerablePackageIds?: Map<number, number>;
};
// ...
export function PackageVersionsCard({
  pkg,
  onTagClick,
  onVulnClick,
  highlight,
  vulnerablePackageIds,
}: PackageVersionsCardProps) {
  const vulnCount = vulnerablePackageIds
    ? pkg.data.reduce(
        (acc, e) => acc + (vulnerablePackageIds.has(e.package_id) ? 1 : 0),
        0,
      )
    : 0;
  const hasAnyVuln = vulnCount > 0;

  return (
    <div
      id={`package-${pkg.key}`}
      className={`p-2 border rounded-lg shadow-md text-sm w-full transition-colors duration-1000
      ${highlight ? "border-blue-500 bg-gray-800" : "border-slate-600 bg-gray-800"}`}
    >
      <div className="flex items-center pr-1">
        <h3 className="font-bold text-white ml-1 mb-2 flex items-center gap-2 w-5/6">
          <span className="truncate">{pkg.name}</span>
        </h3>
        <div className="w-1/6 flex justify-end">
          {hasAnyVuln && (
            <span
              title={`${vulnCount} vulnerable ${vulnCount === 1 ? "version" : "versions"}`}
              aria-label="Vulnerable versions present"
              className="inline-flex items-center text-yellow-400"
            >
              ⚠️
            </span>
          )}
        </div>
      </div>
      <div
        className="max-h-56 overflow-y-auto border-t border-slate-700"
        aria-label={`${pkg.name} versions`}
      >
        <table className="w-full text-xs text-left text-gray-400 table-fixed">
          <thead className="sticky top-0 bg-gray-950 text-gray-500 border-b border-slate-700">
            <tr>
              <th className="px-2 py-1 w-1/6">Version</th>
              <th className="px-2 py-1 w-1/6"></th>
              <th className="px-2 py-1 w-2/6">Path</th>
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
                    {entry.system_tag_username && entry.system_tag_hostname && (
                      <button
                        className="hover:text-gray-300 hover:underline cursor-pointer"
                        onClick={() => onTagClick?.(entry.system_tag_id)}
                      >
                        {entry.system_tag_username}: {entry.system_tag_hostname}
                      </button>
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
}
