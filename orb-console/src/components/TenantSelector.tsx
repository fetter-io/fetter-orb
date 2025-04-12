import { Tenant } from "@/types";

type TenantSelectorProps = {
  tenants: [number, Tenant][];
  selectedId: number | null;
  onChange: (id: number | null) => void;
};
export function TenantSelector({
  tenants,
  selectedId,
  onChange,
}: TenantSelectorProps) {
  return (
    <div className="flex flex-col items-start sm:items-end gap-1 mb-2">
      <span className="text-xs text-gray-400 font-semibold">Tenant</span>
      <select
        className="text-sm bg-slate-800 text-white border border-slate-600 rounded px-2 py-1"
        value={selectedId ?? ""}
        onChange={(e) => {
          const val = e.target.value;
          onChange(val ? parseInt(val) : null);
        }}
      >
        <option value="" disabled>
          Select a tenant
        </option>

        {tenants.map(([id, tenant]) => (
          <option key={id} value={id}>
            {tenant.name}
          </option>
        ))}
      </select>
    </div>
  );
}
