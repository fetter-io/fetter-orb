import { PackageVersions } from "@/types";

type PackageVersionsCardProps = {
  pkg: PackageVersions;
  onTagClick?: (systemTagId: number) => void;
};

export function PackageVersionsCard({
  pkg,
  onTagClick,
}: PackageVersionsCardProps) {
  return (
    <div className="p-4 border border-slate-600 rounded-lg bg-gray-800 shadow-md text-sm w-full">
      <h3 className="font-bold text-white mb-2">{pkg.name}</h3>
      <div className="space-y-1">
        {pkg.data.map((entry, index) => (
          <div key={index} className="grid grid-cols-4 gap-4 text-gray-400">
            <div>
              {/* <span className="text-gray-500">Version: </span> */}
              <span>{entry.version}</span>
            </div>
            <div className="col-span-2">
              {/* <span className="text-gray-500">Site: </span> */}
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
        ))}
      </div>
    </div>
  );
}
