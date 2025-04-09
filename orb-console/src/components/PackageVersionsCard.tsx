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
      className={`p-4 border rounded-lg shadow-md text-sm w-full
      ${
        highlight
          ? "border-blue-500 bg-gray-700"
          : "border-slate-600 bg-gray-800"
      }`}

      // className="p-4 border border-slate-600 rounded-lg bg-gray-800 shadow-md text-sm w-full"
    >
      <h3 className="font-bold text-white mb-2">{pkg.name}</h3>
      <div className="space-y-1">
        {pkg.data.map((entry, index) => {
          const isVulnerable =
            vulnerablePackageIds?.has(entry.package_id) ?? false;

          return (
            <div
              key={index}
              className="grid grid-cols-4 gap-4 text-gray-400 items-center"
            >
              <div>
                <span className="inline-flex items-center gap-1">
                  {entry.version}
                  {isVulnerable && (
                    <button
                      title="This version has known vulnerabilities"
                      className="text-yellow-400 hover:underline"
                      onClick={() => onVulnClick?.(entry.package_id)}
                    >
                      ⚠
                    </button>
                  )}
                </span>
              </div>
              <div className="col-span-2">
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
