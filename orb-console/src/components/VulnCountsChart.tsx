import { useState, useEffect } from "react";
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

type VulnCountsChartProps = {
  data: AuditEntry[];
  vulnerablePackageIds: Map<number, number>;
  minVulnScore?: number;
  maxVulnScore?: number;
  onFilterChange?: (minBin: number, maxBin: number) => void;
};

export function VulnCountsChart({
  data,
  vulnerablePackageIds,
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
  const bins = Array.from({ length: 10 }, (_, i) => {
    const isLast = i === 9;
    return {
      binIndex: i,
      // range: `${i}-${i + 1}`,
      rangeLabel: isLast ? `${i}-10` : `${i}-${i}.9`,
      count: 0,
    };
  });

  // Count vulnerabilities in each bin using pre-computed scores
  data.forEach((entry) => {
    const score = vulnerablePackageIds.get(entry.package_id) || 0;
    if (score > 0) {
      const binIndex = Math.min(Math.floor(score), 9); // Cap at 9 for 9.x scores
      const bin = bins[binIndex];
      if (bin) {
        bin.count++;
      }
    }
  });

  // Filter out empty bins for cleaner display
  const chartData = bins.filter((bin) => bin.count > 0);

  // Handle bar click to set filter range
  const handleBarClick = (data: { binIndex?: number }) => {
    if (onFilterChange && data && data.binIndex !== undefined) {
      const binIndex = data.binIndex;

      if (isShiftPressed && lastClickedBin !== null) {
        // Shift-click: select range from lastClickedBin to current binIndex
        const startBin = Math.min(lastClickedBin, binIndex);
        const endBin = Math.max(lastClickedBin, binIndex);
        onFilterChange(startBin, endBin);
      } else {
        // Regular click: select single bin
        onFilterChange(binIndex, binIndex);
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

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ value: number }>;
    label?: string;
  }) => {
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
            CVSS {label}: {payload[0]?.value} packages
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
              Click to filter, shift+click to select range
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-50 bg-slate-900 rounded-md pt-2 border border-slate-700">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
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
