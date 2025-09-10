import { useState, useEffect, useRef } from "react";
import { AuditEntry } from "@/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import colors from "tailwindcss/colors";

// Helper function to calculate the highest CVSS score for a vulnerability record
const getPackageVulnerabilityScore = (record: any) => {
  const { vuln_ids, vuln_infos } = record;
  let highestScore = 0;

  vuln_ids.forEach((id: string) => {
    const vuln = vuln_infos[id];
    if (!vuln?.cvss_details) return;

    // Sort CVSS details by version (highest first) and take the first one
    const sortedCvss = vuln.cvss_details.sort((a: any, b: any) => {
      const getVersionNumber = (version: string) => {
        const match = version.match(/V(\d+)_(\d+)/);
        if (!match) return 0;
        return parseFloat(`${match[1]}.${match[2]}`);
      };
      return getVersionNumber(b.version) - getVersionNumber(a.version);
    });

    const highestVersionCvss = sortedCvss[0];
    if (highestVersionCvss && highestVersionCvss.score > highestScore) {
      highestScore = highestVersionCvss.score;
    }
  });

  return highestScore;
};

type VulnCountsChartProps = {
  data: AuditEntry[];
  minVulnScore?: number;
  maxVulnScore?: number;
  onFilterChange?: (minScore: number, maxScore: number) => void;
};

export function VulnCountsChart({
  data,
  minVulnScore = 0,
  maxVulnScore = 10,
  onFilterChange,
}: VulnCountsChartProps) {
  const [lastClickedBin, setLastClickedBin] = useState<number | null>(null);
  const [isShiftPressed, setIsShiftPressed] = useState(false);

  // Track shift key state
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Shift") {
        setIsShiftPressed(true);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Shift") {
        setIsShiftPressed(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);
  // Create bins for CVSS scores (0-1, 1-2, 2-3, ..., 9-10)
  const bins = Array.from({ length: 10 }, (_, i) => ({
    binIndex: i,
    range: `${i}-${i + 1}`,
    rangeLabel: `${i}.0-${i}.9`,
    count: 0,
    color:
      i >= 9
        ? colors.red[500] // Critical (9.0+)
        : i >= 7
          ? colors.orange[500] // High (7.0-8.9)
          : i >= 4
            ? colors.yellow[500] // Medium (4.0-6.9)
            : colors.green[500], // Low (0-3.9)
  }));

  // Count vulnerabilities in each bin
  data.forEach((entry) => {
    const score = getPackageVulnerabilityScore(entry.record);
    if (score > 0) {
      const binIndex = Math.min(Math.floor(score), 9); // Cap at 9 for 9.x scores
      bins[binIndex].count++;
    }
  });

  // Filter out empty bins for cleaner display
  const chartData = bins.filter((bin) => bin.count > 0);

  // Handle bar click to set filter range
  const handleBarClick = (data: any) => {
    if (onFilterChange && data && data.binIndex !== undefined) {
      const binIndex = data.binIndex;

      if (isShiftPressed && lastClickedBin !== null) {
        // Shift-click: select range from lastClickedBin to current binIndex
        const startBin = Math.min(lastClickedBin, binIndex);
        const endBin = Math.max(lastClickedBin, binIndex);
        onFilterChange(startBin, endBin + 0.99);
      } else {
        // Regular click: select single bin
        onFilterChange(binIndex, binIndex + 0.99);
        setLastClickedBin(binIndex);
      }
    }
  };

  // Check if a bin is currently selected (handles both single bins and ranges)
  const isBinSelected = (binIndex: number) => {
    return (
      binIndex >= Math.floor(minVulnScore) &&
      binIndex <= Math.floor(maxVulnScore)
    );
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div
          style={{
            backgroundColor: colors.slate[800],
            border: `1px solid ${colors.slate[600]}`,
            padding: "8px",
            borderRadius: "4px",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
          }}
        >
          <p style={{ color: colors.slate[100], fontSize: 10, margin: 0 }}>
            CVSS {label}: {payload[0].value} packages
          </p>
          {onFilterChange && (
            <p
              style={{
                color: colors.slate[400],
                fontSize: 10,
                margin: 0,
                fontStyle: "italic",
              }}
            >
              Click to filter • Shift+click to select range
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-48 bg-slate-900 rounded-md pt-2 border border-slate-700">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
        >
          <XAxis
            dataKey="rangeLabel"
            tick={{ fill: colors.slate[400], fontSize: 10 }}
            axisLine={{ stroke: colors.slate[600] }}
            tickLine={{ stroke: colors.slate[600] }}
          />
          <YAxis
            tick={{ fill: colors.slate[400], fontSize: 10 }}
            axisLine={{ stroke: colors.slate[600] }}
            tickLine={{ stroke: colors.slate[600] }}
            domain={[0, "dataMax"]}
          />
          <Tooltip
            content={<CustomTooltip />}
            wrapperStyle={{ outline: "none" }}
            cursor={{ fill: "transparent" }}
          />
          <Bar
            dataKey="count"
            stroke={colors.slate[600]}
            strokeWidth={1}
            onClick={handleBarClick}
            style={{ cursor: onFilterChange ? "pointer" : "default" }}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={
                  isBinSelected(entry.binIndex)
                    ? colors.blue[900]
                    : colors.slate[800]
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
