// src/hooks/useDashboardData.ts
import { useEffect, useState, useCallback } from "react";

type Fetcher<T> = () => Promise<T>;

export function useDashboardData<T>(
  fetcher: Fetcher<T>,
  options?: {
    active?: boolean; // control if data should load based on tab
    pollInterval?: number; // polling in ms, if desired
  },
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetcher()
      .then((res) => {
        setData(res);
        setLastFetched(new Date());
      })
      .catch((err) => {
        setError(err);
        console.error("Dashboard fetch error:", err);
      })
      .finally(() => setLoading(false));
  }, [fetcher]);

  useEffect(() => {
    if (options?.active ?? true) {
      load();
    }

    if (options?.pollInterval && (options.active ?? true)) {
      const id = setInterval(load, options.pollInterval);
      return () => clearInterval(id);
    }
  }, [load, options?.active, options?.pollInterval]);

  return { data, loading, error, lastFetched, refresh: load };
}
