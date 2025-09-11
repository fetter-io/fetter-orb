import { Spinner } from "@/components/Spinner";
import { DataState } from "@/hooks/useDashboardData";

type DashboardStatusProps<T = unknown> = {
  label: string;
  state: DataState<T>;
};

export function DashboardStatus({ label, state }: DashboardStatusProps) {
  const { refresh, lastFetched, loading, error } = state;

  return (
    <div className="relative">
      <div className="flex flex-col items-end gap-1">
        <button
          onClick={refresh}
          disabled={loading}
          className={`flex items-center justify-center rounded-full p-2 border border-slate-600 hover:border-slate-500 transition-colors duration-200
            text-zinc-400 hover:text-zinc-300
            ${
              loading
                ? "bg-slate-800 cursor-not-allowed"
                : "bg-gray-900 hover:bg-slate-800"
            }`}
          aria-label="Refresh"
          title="Refresh"
        >
          <Spinner
            className={`h-4 w-4 ${loading ? "animate-spin text-gray-200" : ""}`}
          />
        </button>

        <div className="text-xs text-gray-600">
          {lastFetched
            ? `Last updated at ${lastFetched.toLocaleTimeString()}`
            : ""}
        </div>
      </div>

      {error && (
        <div className="text-xs text-red-400 mt-1">Failed to load {label}</div>
      )}
    </div>
  );
}
