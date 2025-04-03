import { SystemTag } from "@/types";

export function SystemTagCard({ tag }: { tag: SystemTag }) {
  return (
    <div className="border rounded-lg p-4 shadow-sm bg-gray-50 text-sm text-gray-700 w-full max-w-2xl">
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
