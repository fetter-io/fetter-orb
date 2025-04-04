import { Package } from "@/types";

type PackageCardProps = {
  pkg: Package;
};

export function PackageCard({ pkg }: PackageCardProps) {
  return (
    <div className="p-2 pl-4 border border-slate-600 rounded-lg bg-gray-800 shadow-md text-sm w-full">
      <h3 className="font-bold mb-1">{pkg.name}</h3>

      <div className="flex flex-col gap-1 text-gray-400">
        <div className="flex gap-2">
          <span className="w-20 text-gray-500">Key:</span>
          <span>{pkg.key}</span>
        </div>
        <div className="flex gap-2">
          <span className="w-20 text-gray-500">Version:</span>
          <span>{pkg.version}</span>
        </div>
        {pkg.direct_url && (
          <div className="flex gap-2">
            <span className="w-20 text-gray-500">Source:</span>
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
      </div>
    </div>
  );
}
