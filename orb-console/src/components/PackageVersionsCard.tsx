import { PackageVersions } from "@/types";

type PackageVersionsCardProps = {
  pkg: PackageVersions;
  onTagClick?: (systemTagId: number) => void;
  onVulnClick?: (packageId: number) => void;
  highlight?: boolean;
  vulnerablePackageIds?: Set<number>;
};

export function PackageVersionsCard({
  pkg,
  onTagClick,
  onVulnClick,
  highlight,
  vulnerablePackageIds,
}: PackageVersionsCardProps) {
  return (
    <div
      id={`package-${pkg.key}`}
      className={`p-4 border rounded-lg shadow-md text-sm w-full transition-colors duration-1000
      ${
        highlight
          ? "border-blue-500 bg-gray-800"
          : "border-slate-600 bg-gray-800"
      }`}
    >
      <h3 className="font-bold text-white mb-2">{pkg.name}</h3>
      <div className="space-y-1">
        {pkg.data.map((entry, index) => {
          const isVulnerable =
            vulnerablePackageIds?.has(entry.package_id) ?? false;

          return (
            <div
              key={index}
              className="grid grid-cols-6 gap-2 text-gray-400 items-center"
            >
              <div>
                <span className="inline-flex items-center gap-1">
                  {entry.version}
                </span>
              </div>
              <div>
                <span className="inline-flex items-center gap-x-2">
                  <a
                    href={`https://pypi.org/project/${pkg.key}/${entry.version}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    PyPI
                  </a>

                  {isVulnerable && (
                    <button
                      title="Vulnerability details"
                      className="border-b border-transparent hover:border-yellow-400 cursor-pointer"
                      onClick={() => onVulnClick?.(entry.package_id)}
                    >
                      ⚠️
                    </button>
                  )}
                </span>
              </div>
              <div className="col-span-3">
                <span className="break-all">{entry.path}</span>
              </div>
              <div className="col-span-1">
                {entry.system_tag_username && entry.system_tag_hostname && (
                  <button
                    className="hover:text-gray-300 hover:underline ml-auto"
                    onClick={() => onTagClick?.(entry.system_tag_id)}
                  >
                    {entry.system_tag_username}: {entry.system_tag_hostname}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
