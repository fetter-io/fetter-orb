import { PackageVersions } from "@/types";

type ValidationPanelProps = {
  validationSets: {
    missing: Map<number, string | null>;
    unrequired: Map<number, string | null>;
    misdefined: Map<number, string | null>;
    undefined: Map<number, string | null>;
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

  const sortEntriesByPackageName = (entries: [number, string | null][]) => {
    return entries.sort(([idA], [idB]) => {
      const pkgA = idToPackage.get(idA);
      const pkgB = idToPackage.get(idB);
      const nameA = pkgA?.name ?? "Unknown";
      const nameB = pkgB?.name ?? "Unknown";
      return nameA.localeCompare(nameB);
    });
  };

  const sections = [
    {
      label: "Missing",
      entries: sortEntriesByPackageName([...validationSets.missing.entries()]),
    },
    {
      label: "Unrequired",
      entries: sortEntriesByPackageName([
        ...validationSets.unrequired.entries(),
      ]),
    },
    {
      label: "Misdefined",
      entries: sortEntriesByPackageName([
        ...validationSets.misdefined.entries(),
      ]),
    },
    {
      label: "Undefined",
      entries: sortEntriesByPackageName([
        ...validationSets.undefined.entries(),
      ]),
    },
  ];

  return (
    <div className="py-2 px-2 border border-slate-600 rounded-lg shadow-sm text-sm w-full text-gray-300 bg-gray-800">
      <h3 className="text-white font-semibold text-base mb-2 ml-1">
        Validation
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    <th className="px-2 py-1 w-1/2">Site Packages</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map(([id, sitePackages]) => {
                    const pkg = idToPackage.get(id);
                    return (
                      <tr
                        key={`${label}-${id}`}
                        className="border-b border-slate-800 bg-gray-900 break-all"
                      >
                        <td className="px-2 py-1 truncate">
                          {pkg?.name ?? "Unknown"}
                        </td>
                        <td className="px-2 py-1">{pkg?.version ?? "—"}</td>
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
