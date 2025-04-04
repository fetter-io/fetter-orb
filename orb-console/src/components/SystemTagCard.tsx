import { SystemTag } from "@/types";

export function SystemTagCard({ tag }: { tag: SystemTag }) {
  return (
    <div className="p-4 border border-slate-600 rounded-lg shadow-sm bg-gray-800 text-sm text-gray-300 w-full">
      <p>
        <strong>User:</strong> {tag.username}
      </p>
      <p>
        <strong>Host:</strong> {tag.hostname}
      </p>
      <p>
        <strong>OS:</strong> {tag.os_name} {tag.os_version}
      </p>
      <p>
        <strong>Arch:</strong> {tag.architecture}
      </p>
      <p>
        <strong>Cores:</strong> {tag.logical_cores}
      </p>
    </div>
  );
}
