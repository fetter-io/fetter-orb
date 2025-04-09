import { SystemTag } from "@/types";

type SystemTagSelectorProps = {
  selectedId: number | null;
  onChange: (id: number | null) => void;
  systemTags: SystemTag[] | undefined;
  resultCount: number;
};

export function SystemTagSelector({
  selectedId,
  onChange,
  systemTags,
  resultCount,
}: SystemTagSelectorProps) {
  return (
    <div className="flex flex-col items-start sm:items-end gap-1">
      <select
        value={selectedId ?? ""}
        onChange={(e) => {
          const value = e.target.value;
          onChange(value === "" ? null : parseInt(value));
        }}
        className="text-sm bg-slate-800 border border-slate-600 text-gray-300 px-2 py-1 rounded"
      >
        <option value="">All Systems</option>
        {systemTags?.map((tag) => (
          <option key={tag.id} value={tag.id}>
            {tag.username}: {tag.hostname}
          </option>
        ))}
      </select>

      <p className="text-xs text-gray-500">Viewing {resultCount} packages</p>
    </div>
  );
}
