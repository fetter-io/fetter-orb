import { Package } from "@/types";

type PackageCardProps = {
  pkg: Package;
};

export function PackageCard({ pkg }: PackageCardProps) {
  return (
    <div className="border rounded-xl p-4 shadow-md w-full max-w-md">
      <h3 className="font-bold text-lg">{pkg.name}</h3>
      <p className="text-sm text-gray-600">Key: {pkg.key}</p>
      <p className="text-sm">Version: {pkg.version}</p>
      {pkg.direct_url && (
        <p className="text-sm text-blue-600">
          <a href={pkg.direct_url} target="_blank" rel="noopener noreferrer">
            Source
          </a>
        </p>
      )}
    </div>
  );
}
