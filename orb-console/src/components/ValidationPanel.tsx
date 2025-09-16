import { PackageVersions, ValidationEntry } from "@/types";

type ValidationPanelProps = {
  validationSets: {
    missing: ValidationEntry[];
    unrequired: ValidationEntry[];
    misdefined: ValidationEntry[];
    undefined: ValidationEntry[];
  };
  packages: PackageVersions[];
};

export function ValidationPanel({
  validationSets,
  packages,
}: ValidationPanelProps) {
  const idToPackage = new Map<number, { name: string; version: string }>();
  for (const pkg of packages) {
    for (const entry of pkg.data) {
      idToPackage.set(entry.package_id, {
        name: pkg.name,
        version: entry.version,
      });
    }
  }
  const sortEntriesByPackageName = (entries: ValidationEntry[]) => {
    return entries.sort(([idA], [idB]) => {
      const pkgA = idToPackage.get(idA);
      const pkgB = idToPackage.get(idB);
      const nameA = pkgA?.name ?? "Unknown";
      const nameB = pkgB?.name ?? "Unknown";
      const versionA = pkgA?.version ?? "";
      const versionB = pkgB?.version ?? "";

      // Sort by name first
      const nameComparison = nameA.localeCompare(nameB);
      if (nameComparison !== 0) {
        return nameComparison;
      }
      // If names are equal, sort by version
      return versionA.localeCompare(versionB);
    });
  };

  const sections = [
    {
      label: "Missing",
      entries: sortEntriesByPackageName(validationSets.missing),
    },
    {
      label: "Unrequired",
      entries: sortEntriesByPackageName(validationSets.unrequired),
    },
    {
      label: "Misdefined",
      entries: sortEntriesByPackageName(validationSets.misdefined),
    },
  ];

  return (
    <div className="py-2 px-2 border border-slate-600 rounded-lg shadow-sm text-sm w-full text-gray-300 bg-gray-800">
      <h3 className="text-white font-semibold text-base mb-2 ml-1">
        Validation
      </h3>

      <div className="grid grid-cols-1 gap-2">
        {sections.map(({ label, entries }) => (
          <div
            key={label}
            className="border border-slate-700 rounded bg-gray-900 overflow-hidden"
          >
            <div className="px-2 py-2 text-sm font-semibold text-gray-400">
              {label} ({entries.length})
            </div>
            <div className="max-h-64 overflow-y-auto">
              <table className="table-fixed w-full text-xs text-left text-gray-400">
                <thead className="sticky top-0 bg-gray-950 text-gray-500 border-b border-slate-700">
                  <tr>
                    <th className="px-2 py-1 w-1/4">Package</th>
                    <th className="px-2 py-1 w-1/4">Version</th>
                    <th className="px-2 py-1 w-1/2">Sites</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map(([id, ds, sitePackages]) => {
                    const pkg = idToPackage.get(id); // might be null
                    const displayName = id == -1 && ds ? ds[0] : pkg?.name ?? "Unknown";
                    const displayVersion = id == -1 && ds ? ds[1] : pkg?.version ?? "—";

                    return (
                      <tr
                        key={`${label}-${id}-${displayName}-${displayVersion}-${sitePackages || 'no-site'}`}
                        className="border-b border-slate-800 bg-gray-900 break-all"
                      >
                        <td className="px-2 py-1 truncate">{displayName}</td>
                        <td className="px-2 py-1">{displayVersion}</td>
                        <td className="px-2 py-1">{sitePackages ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
