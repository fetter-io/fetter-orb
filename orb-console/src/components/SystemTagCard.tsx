import { SystemTag } from "@/types";
import { useState } from "react";
import { SystemTagActiveIcon } from "./SystemTagActiveIcon";

type SystemTagCardProps = {
  tag: SystemTag;
  highlight?: boolean;
  onPackagesClick?: (id: number) => void;
  onActiveChange?: (id: number, active: boolean) => void;
  canModify?: boolean;
};

export function SystemTagCard({
  tag,
  highlight,
  onPackagesClick,
  onActiveChange,
  canModify = true,
}: SystemTagCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleActiveToggle = async () => {
    setIsUpdating(true);
    const newActive = !tag.active;

    try {
      const apiBase = process.env.NEXT_PUBLIC_ORB_MODEL!;
      const response = await fetch(`${apiBase}/system_tag_active`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          system_tag_id: tag.id,
          active: newActive,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.updated) {
          onActiveChange?.(tag.id, newActive);
        }
      }
    } catch (error) {
      console.error("Failed to update system tag active state:", error);
    } finally {
      setIsUpdating(false);
    }
  };
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
      <div className="flex items-center mb-2">
        <div className="flex items-center mr-2">
          <SystemTagActiveIcon
            active={tag.active}
            isUpdating={isUpdating}
            onToggle={handleActiveToggle}
            canModify={canModify}
          />
        </div>
        <p className="font-bold">
          <span className="text-gray-300">{tag.username}</span>
          <span className="text-gray-300">: </span>
          <span className="text-gray-300">{tag.hostname}</span>
        </p>
        {tag.active && (
          <div className="ml-2">
            <button
              className="text-gray-500 hover:underline hover:text-gray-300 cursor-pointer"
              onClick={() => onPackagesClick?.(tag.id)}
            >
              📦
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-2 mb-2 break-all text-sm text-gray-400">
        <div>
          <span className="text-gray-500">OS: </span>
          <span>
            {tag.os_name} {tag.os_version}
          </span>
        </div>
        <div>
          <span className="text-gray-500">Arch: Cores: </span>
          <span>
            {tag.architecture}: {tag.logical_cores}cpu
          </span>
        </div>
      </div>

      {/* Scrollable tables - stacked on mobile, side-by-side on larger screens */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
        {/* Scrollable ping table */}
        <div className="max-h-32 overflow-y-auto border-t border-slate-700 pt-0">
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
        <div className="max-h-32 overflow-y-auto border-t border-slate-700">
          <table className="w-full text-xs text-left text-gray-400">
            <thead className="sticky top-0 bg-gray-950 text-gray-500 border-b border-slate-700">
              <tr>
                <th className="px-2 py-1">Sites</th>
              </tr>
            </thead>
            <tbody>
              {[...tag.site_packages].sort().map((path) => (
                <tr
                  key={path}
                  className="border-b border-slate-800 bg-gray-900"
                >
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
