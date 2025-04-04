import { SystemTag } from "@/types";

type SystemTagCardProps = {
  tag: SystemTag;
  highlight?: boolean;
  onPackagesClick?: (id: number) => void;
};

export function SystemTagCard({
  tag,
  highlight,
  onPackagesClick,
}: SystemTagCardProps) {
  return (
    <div
      id={`system-tag-${tag.id}`}
      className={`py-2 px-4 rounded-lg shadow-sm text-sm w-full
        ${
          highlight
            ? "border border-slate-500 bg-gray-700 text-gray-300"
            : "border border-slate-600 bg-gray-800 text-gray-300"
        }`}
    >
      <p className="mb-2">
        <span className="text-gray-500">User: </span>
        <span>{tag.username}</span>
      </p>

      <div className="grid grid-cols-5 gap-4">
        <div>
          <span className="text-gray-500">Host: </span>
          <span>{tag.hostname}</span>
        </div>
        <div>
          <span className="text-gray-500">OS: </span>
          <span>
            {tag.os_name} {tag.os_version}
          </span>
        </div>
        <div>
          <span className="text-gray-500">Arch: </span>
          <span>{tag.architecture}</span>
        </div>
        <div>
          <span className="text-gray-500">Cores: </span>
          <span>{tag.logical_cores}</span>
        </div>
        <div>
          <button
            className="text-gray-500 hover:underline hover:text-gray-300"
            onClick={() => onPackagesClick?.(tag.id)}
          >
            Packages
          </button>
        </div>
      </div>
    </div>
  );
}
