import { PackageVersions } from "@/types";

type ValidationPanelProps = {
  validationSets: {
    missing: Set<number>;
    unrequired: Set<number>;
    misdefined: Set<number>;
    undefined: Set<number>;
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

  const sections = [
    { label: "Missing", set: validationSets.missing },
    { label: "Unrequired", set: validationSets.unrequired },
    { label: "Misdefined", set: validationSets.misdefined },
    { label: "Undefined", set: validationSets.undefined },
  ];

  return (
    <div className="py-2 px-4 border border-slate-600 rounded-lg shadow-sm text-sm w-full text-gray-300 bg-gray-800">
      <h3 className="text-white font-semibold text-base mb-2">
        Validation Summary
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sections.map(({ label, set }) => (
          <div
            key={label}
            className="border border-slate-700 rounded bg-gray-900 overflow-hidden"
          >
            <div className="px-2 py-1 text-sm font-semibold text-gray-300 border-b border-slate-700 bg-gray-950">
              {label} ({set.size})
            </div>
            <div className="max-h-32 overflow-y-auto">
              <table className="table-fixed w-full text-xs text-left text-gray-400">
                <thead className="sticky top-0 bg-gray-950 text-gray-500 border-b border-slate-700">
                  <tr>
                    <th className="px-2 py-1 w-1/2">Package</th>
                    <th className="px-2 py-1 w-1/2">Version</th>
                  </tr>
                </thead>
                <tbody>
                  {[...set].map((id) => {
                    const pkg = idToPackage.get(id);
                    return (
                      <tr
                        key={id}
                        className="border-b border-slate-800 bg-gray-900"
                      >
                        <td className="px-2 py-1 truncate">
                          {pkg?.name ?? "Unknown"}
                        </td>
                        <td className="px-2 py-1">{pkg?.version ?? "—"}</td>
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
