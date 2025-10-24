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
      className={`py-2 px-2 mb-4 border rounded-lg shadow-sm text-sm w-full text-gray-300 transition-colors duration-1000
        ${
          highlight
            ? "border-blue-500 bg-gray-800"
            : "border-slate-600 bg-gray-800"
        }`}
    >
      {/* Basic system tag info */}
      <p>
        <span className="text-gray-500">User: </span>
        <span>{tag.username}</span>
      </p>

      <div className="grid grid-cols-5 gap-2 mb-2 break-all">
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
            className="text-gray-500 hover:underline hover:text-gray-300 cursor-pointer"
            onClick={() => onPackagesClick?.(tag.id)}
          >
            📦
          </button>
        </div>
      </div>

      {/* Scrollable tables - stacked on mobile, side-by-side on larger screens */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
        {/* Scrollable ping table */}
        <div className="h-32 overflow-y-auto border-t border-slate-700 pt-0">
          <table className="w-full text-xs text-left text-gray-400">
            <thead className="sticky top-0 bg-gray-950 text-gray-500 border-b border-slate-700">
              <tr>
                <th className="px-2 py-1">Date</th>
                <th className="px-2 py-1">Time</th>
                <th className="px-2 py-1">Scanned</th>
              </tr>
            </thead>
            <tbody>
              {[...tag.pings]
                .sort(
                  (a, b) =>
                    new Date(b.timestamp).getTime() -
                    new Date(a.timestamp).getTime(),
                )
                .map((ping) => {
                  const dt = new Date(ping.timestamp);
                  return (
                    <tr
                      key={ping.timestamp}
                      className="border-b border-slate-800 bg-gray-900"
                    >
                      <td className="px-2 py-1 whitespace-nowrap">
                        {dt.toLocaleDateString()}
                      </td>
                      <td className="px-2 py-1 whitespace-nowrap">
                        {dt.toLocaleTimeString()}
                      </td>
                      <td className="px-2 py-1">{ping.scanned ? "✓" : "–"}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Scrollable site_packages table */}
        <div className="h-32 overflow-y-auto border-t border-slate-700">
          <table className="w-full text-xs text-left text-gray-400">
            <thead className="sticky top-0 bg-gray-950 text-gray-500 border-b border-slate-700">
              <tr>
                <th className="px-2 py-1">Sites</th>
              </tr>
            </thead>
            <tbody>
              {[...tag.site_packages].sort().map((path) => (
                <tr key={path} className="border-b border-slate-800 bg-gray-900">
                  <td className="px-2 py-1 break-all">{path}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
