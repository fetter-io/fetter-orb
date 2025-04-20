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
          className={`text-sm rounded-full px-2 py-1 border border-slate-600 transition-colors duration-200
    text-zinc-400 hover:text-zinc-300
    ${
      loading
        ? "bg-gray-700 animate-pulse cursor-not-allowed opacity-90"
        : "bg-gray-800 hover:bg-gray-600"
    }`}
          aria-label="Refresh"
          title="Refresh"
        >
          <span className={`inline-block ${loading ? "text-gray-300" : ""}`}>
            ↻
          </span>
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
