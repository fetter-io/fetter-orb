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
      <button onClick={refresh} className="text-xs text-blue-600 underline">
        Refresh
      </button>

      <div className="text-xs text-gray-400 mt-1">
        {lastFetched
          ? `Last updated at ${lastFetched.toLocaleTimeString()}`
          : ""}
      </div>

      {loading && <div className="text-sm text-gray-400">Loading...</div>}
      {error && (
        <div className="text-sm text-red-500">Failed to load {label}</div>
      )}
    </>
  );
}
