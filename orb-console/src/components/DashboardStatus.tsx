type DashboardStatusProps = {
  label: string;
  state: {
    refresh: () => void;
    lastFetched: Date | null;
    loading: boolean;
    error: Error | null;
  };
};

export function DashboardStatus({ label, state }: DashboardStatusProps) {
  const { refresh, lastFetched, loading, error } = state;

  return (
    <div className="relative">
      <div className="flex flex-col items-start sm:items-end gap-1">
        <button
          onClick={refresh}
          disabled={loading}
          className={`text-sm rounded-full px-2 py-1 border border-slate-600 bg-gray-800 transition text-zinc-400
            hover:bg-gray-700 hover:text-zinc-300
            ${loading ? "cursor-not-allowed opacity-75" : ""}`}
          aria-label="Refresh"
          title="Refresh"
        >
          {loading ? <span className="inline-block animate-spin">⟳</span> : "↻"}
        </button>

        <div className="text-xs text-gray-500">
          {lastFetched
            ? `Last updated at ${lastFetched.toLocaleTimeString()}`
            : ""}
        </div>
      </div>

      {error && (
        <div className="text-xs text-red-500 mt-1">Failed to load {label}</div>
      )}
    </div>
  );
}
