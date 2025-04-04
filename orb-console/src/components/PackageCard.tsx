import { Package } from "@/types";

type PackageCardProps = {
  pkg: Package;
};

export function PackageCard({ pkg }: PackageCardProps) {
  return (
    <div className="p-4 border border-slate-600 rounded-lg bg-gray-800 shadow-md text-sm w-full ">
      <h3 className="font-bold ">{pkg.name}</h3>
      <p className="text-gray-500">Key: {pkg.key}</p>
      <p className="text-gray-400">Version: {pkg.version}</p>
      {pkg.direct_url && (
        <p className="text-blue-600">
          <a href={pkg.direct_url} target="_blank" rel="noopener noreferrer">
            Source
          </a>
        </p>
      )}
    </div>
  );
}
