import { SystemTag } from "@/types";

export function SystemTagCard({ tag }: { tag: SystemTag }) {
  return (
    <div className="py-2 px-4 border border-slate-600 rounded-lg shadow-sm bg-gray-800 text-sm text-gray-300 w-full">
      <p className="mb-2">
        <span className="text-gray-500">User: </span>
        <span>{tag.username}</span>
      </p>

      <div className="grid grid-cols-4 gap-4">
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
      </div>
    </div>
  );
}
