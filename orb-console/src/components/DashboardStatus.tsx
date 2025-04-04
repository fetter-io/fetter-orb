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
    <>
      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
        <div>
          {lastFetched
            ? `Last updated at ${lastFetched.toLocaleTimeString()}`
            : ""}
        </div>
        <button
          onClick={refresh}
          className="text-sm rounded-l px-2 py-1 border border-slate-600 bg-gray-800 hover:bg-gray-700 text-zinc-400 hover:text-zinc-300 transition"
          aria-label="Refresh"
          title="Refresh"
        >
          ↻
        </button>
      </div>

      {loading && <div className="text-sm text-gray-400">Loading...</div>}
      {error && (
        <div className="text-sm text-red-500">Failed to load {label}</div>
      )}
    </>
  );
}
