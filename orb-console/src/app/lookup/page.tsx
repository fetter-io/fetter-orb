"use client";

import { useState, Suspense, useCallback, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { HeaderPreAuth } from "@/components/HeaderPreAuth";
import { Footer } from "@/components/Footer";
import { VulnCard } from "@/components/VulnCard";
import { VulnCountsChart } from "@/components/VulnCountsChart";
import { AuditEntry } from "@/types";
import { getPackageVulnerabilityScore } from "@/utils/vulnerabilityScore";

const Virtuoso = dynamic(
  () => import("react-virtuoso").then((m) => m.Virtuoso),
  { ssr: false },
);

const VIEWPORT_FRACTION = 1.0;
const MIN_LIST_PX = 280;

function LookupContent() {
  const [inputText, setInputText] = useState("");
  const [retainPassing, setRetainPassing] = useState(false);
  const [results, setResults] = useState<AuditEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());
  const [minVulnScore, setMinVulnScore] = useState(0);
  const [maxVulnScore, setMaxVulnScore] = useState(10);

  // Add unique pseudo package_ids for chart functionality (since lookup returns -1 when not logged in)
  const resultsWithIds = useMemo(() => {
    if (!results) return [];
    return results.map((entry, index) => ({
      ...entry,
      package_id: entry.package_id >= 0 ? entry.package_id : -(index + 1),
    }));
  }, [results]);

  // Compute vulnerability scores for each package
  const vulnerablePackageIds = useMemo(() => {
    const scoreMap = new Map<number, number>();
    resultsWithIds.forEach((entry) => {
      const { score } = getPackageVulnerabilityScore(entry.record);
      scoreMap.set(entry.package_id, score);
    });
    return scoreMap;
  }, [resultsWithIds]);

  // Filter results based on score range
  const filteredResults = useMemo(() => {
    return resultsWithIds.filter((entry) => {
      const score = vulnerablePackageIds.get(entry.package_id) || 0;
      return score >= minVulnScore && score <= maxVulnScore;
    });
  }, [resultsWithIds, vulnerablePackageIds, minVulnScore, maxVulnScore]);

  // Responsive list height
  const [listPxHeight, setListPxHeight] = useState<number>(() => {
    if (typeof window === "undefined") return 560;
    return Math.max(
      MIN_LIST_PX,
      Math.floor(window.innerHeight * VIEWPORT_FRACTION),
    );
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    let raf = 0;
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        setListPxHeight(
          Math.max(
            MIN_LIST_PX,
            Math.floor(window.innerHeight * VIEWPORT_FRACTION),
          ),
        );
      });
    };
    window.addEventListener("resize", onResize, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  // fetch vuln data from endpoint.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResults(null);
    setExpandedCards(new Set());
    setMinVulnScore(0);
    setMaxVulnScore(10);

    const lines = inputText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length === 0) {
      setError("Enter at least one package.");
      return;
    }

    setLoading(true);

    try {
      const apiBase = process.env.NEXT_PUBLIC_ORB_MODEL!;
      const params = new URLSearchParams();
      params.set("dep_specs", lines.join("\n"));
      if (retainPassing) {
        params.set("retain_passing", "true");
      }

      const res = await fetch(`${apiBase}/lookup?${params.toString()}`);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const data: AuditEntry[] = await res.json();
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleCardToggle = useCallback(
    (packageId: number, isExpanded: boolean) => {
      setExpandedCards((prev) => {
        const next = new Set(prev);
        if (isExpanded) {
          next.add(packageId);
        } else {
          next.delete(packageId);
        }
        return next;
      });
    },
    [],
  );

  const renderItem = useCallback(
    (_index: number, entry: AuditEntry) => {
      if (!entry) return null;
      const { score } = getPackageVulnerabilityScore(entry.record);
      return (
        <VulnCard
          key={`lookup-vuln-${entry.package_id}`}
          record={entry.record}
          package_id={entry.package_id}
          vulnerabilityScore={score}
          isExpanded={expandedCards.has(entry.package_id)}
          onToggle={(isExpanded) =>
            handleCardToggle(entry.package_id, isExpanded)
          }
        />
      );
    },
    [expandedCards, handleCardToggle],
  );

  return (
    <div className="flex flex-col min-h-screen font-[family-name:var(--font-geist-sans)] bg-gradient-to-b from-slate-950 to-slate-900">
      <HeaderPreAuth subtitle="Vulnerability Lookup" />

      {/* Main Content */}
      <main className="flex-grow px-6 w-full pb-4">
        <div className="max-w-4xl mx-auto mt-4">
          {/* Input Form */}
          <div className="bg-slate-800 rounded-sm px-4 py-2 border border-slate-600">
            <form onSubmit={handleSubmit} className="space-y-2">
              <div>
                <label
                  htmlFor="lookup-input"
                  className="block text-sm font-medium text-gray-500 mb-2"
                >
                  Enter package or dependency specification, one per line
                </label>
                <textarea
                  id="lookup-input"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  rows={8}
                  className="w-full h-16 bg-slate-900 rounded-sm px-2 py-2 text-gray-300 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y font-mono text-sm"
                  placeholder="requests>=1.2"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={retainPassing}
                    onChange={(e) => setRetainPassing(e.target.checked)}
                    className="checkbox-live"
                  />
                  Show all versions
                </label>
                <button
                  type="submit"
                  disabled={loading}
                  className="button-accept"
                >
                  {loading ? "Loading..." : "Submit"}
                </button>
              </div>
            </form>
          </div>

          {/* Error Display */}
          {error && (
            <div className="pt-4">
            <div className="bg-red-900/20 border border-red-800/40 rounded-sm px-4 py-2 text-red-400">
              {error}
            </div>
            </div>
          )}

          {/* Results Display */}
          {results !== null && (
            <div>
              {/* Vulnerability Distribution Chart */}
              {resultsWithIds.length > 0 && (
                <div className="flex flex-col gap-1 my-4">
                  <VulnCountsChart
                    data={resultsWithIds}
                    vulnerablePackageIds={vulnerablePackageIds}
                    minVulnScore={minVulnScore}
                    maxVulnScore={maxVulnScore}
                    onFilterChange={(minBin, maxBin) => {
                      const minScore = minBin;
                      const maxScore = maxBin >= 9 ? maxBin + 1.0 : maxBin + 0.99;
                      setMinVulnScore(minScore);
                      setMaxVulnScore(maxScore);
                    }}
                  />

                  {/* Filter Status and Reset */}
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs text-gray-600">
                      Showing {filteredResults.length} of {resultsWithIds.length} package
                      {resultsWithIds.length === 1 ? "" : "s"}
                    </span>
                    {(minVulnScore > 0 || maxVulnScore < 10) && (
                      <button
                        onClick={() => {
                          setMinVulnScore(0);
                          setMaxVulnScore(10);
                          setExpandedCards(new Set());
                        }}
                        className="text-xs text-blue-400 hover:text-blue-300 transition-colors
                        cursor-pointer"
                      >
                        Show All
                      </button>
                    )}
                  </div>
                </div>
              )}

              {resultsWithIds.length === 0 && (
                <div className="text-xs text-gray-600 mt-2 ml-1">
                  No vulnerabilities found
                </div>
              )}

              {filteredResults.length > 0 && (
                <div className="w-full" style={{ height: listPxHeight }}>
                  <Virtuoso
                    style={{
                      height: listPxHeight,
                      scrollbarWidth: "none",
                      msOverflowStyle: "none",
                    }}
                    className="[&::-webkit-scrollbar]:hidden -mt-2"
                    data={filteredResults}
                    itemContent={
                      renderItem as (
                        index: number,
                        item: unknown,
                      ) => React.JSX.Element | null
                    }
                    increaseViewportBy={{ top: 200, bottom: 200 }}
                    components={{
                      Footer: () => <div style={{ height: "50px" }} />,
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 z-10 bg-slate-950 border-t border-slate-700 px-6 py-2">
        <div className="max-w-4xl mx-auto">
          <Footer />
        </div>
      </footer>
    </div>
  );
}

export default function LookupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-slate-950 to-slate-900">
          <div className="text-slate-400">Loading...</div>
        </div>
      }
    >
      <LookupContent />
    </Suspense>
  );
}
