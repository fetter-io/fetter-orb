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
      {/* Basic system tag info */}
      <p className="mb-2">
        <span className="text-gray-500">User: </span>
        <span>{tag.username}</span>
      </p>

      <div className="grid grid-cols-5 gap-4 mb-2">
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

      {/* Scrollable ping table */}
      <div className="h-32 overflow-y-auto border-t border-slate-700 pt-0 mt-2">
        <table className="w-full text-xs text-left text-gray-400">
          <thead className="sticky top-0 bg-gray-950 text-gray-500 border-b border-slate-700">
            <tr>
              <th className="px-2 py-1">Time</th>
              <th className="px-2 py-1">Scanned</th>
            </tr>
          </thead>
          <tbody>
            {tag.pings.map((ping) => (
              <tr
                key={ping.timestamp}
                className={`border-b border-slate-800 ${
                  ping.scanned ? "bg-gray-700" : "bg-gray-900"
                }`}
              >
                <td className="px-2 py-1 whitespace-nowrap">
                  {new Date(ping.timestamp).toLocaleTimeString()}
                </td>
                <td className="px-2 py-1">{ping.scanned ? "✓" : "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
