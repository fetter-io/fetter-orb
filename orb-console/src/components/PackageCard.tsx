import { Package } from "@/types";

type PackageCardProps = {
  pkg: Package;
};

export function PackageCard({ pkg }: PackageCardProps) {
  return (
    <div className="py-2 px-4 border border-slate-600 rounded-lg bg-gray-800 shadow-md text-sm w-full">
      <h3 className="font-bold mb-1">{pkg.name}</h3>

      <div className="grid grid-cols-4 gap-4 text-gray-400">
        <div>
          <span className="text-gray-500">Key: </span>
          <span>{pkg.key}</span>
        </div>
        <div>
          <span className="text-gray-500">Version: </span>
          <span>{pkg.version}</span>
        </div>
        {pkg.direct_url && (
          <div>
            <span className="text-gray-500">Source: </span>
            <a
              href={pkg.direct_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 underline"
            >
              Link
            </a>
          </div>
        )}
        {/* Optional blank cell to fill the fourth column */}
        {!pkg.direct_url && <div></div>}
      </div>
    </div>
  );
}
