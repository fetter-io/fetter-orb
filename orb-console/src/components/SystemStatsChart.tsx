import { useMemo } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import colors from "tailwindcss/colors";
import { SystemTag } from "@/types";

type SystemStatsChartProps = {
  data: SystemTag[];
  onPointClick?: (systems: SystemTag[]) => void;
};

type ChartDataPoint = {
  osName: string;
  osNameVersion: string;
  archCoreLabel: string;
  count: number;
  systems: SystemTag[];
};

export function SystemStatsChart({
  data,
  onPointClick,
}: SystemStatsChartProps) {
  // extract data into ChartDataPoint
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const groupedData = new Map<string, ChartDataPoint>();

    data.forEach((system) => {
      const osNameVersion = `${system.os_name} ${system.os_version}`;
      const archCoreLabel = `${system.architecture}: ${system.logical_cores}cpu`;
      const key = `${osNameVersion}-${archCoreLabel}`;

      if (groupedData.has(key)) {
        const existing = groupedData.get(key)!;
        existing.count += 1;
        existing.systems.push(system);
      } else {
        groupedData.set(key, {
          osName: system.os_name,
          osNameVersion,
          archCoreLabel,
          count: 1,
          systems: [system],
        });
      }
    });

    return Array.from(groupedData.values());
  }, [data]);

  const getOSColor = (osName: string) => {
    // replace with map
    const colorMap: Record<string, string> = {
      linux: colors.blue[500],
      macos: colors.purple[700],
      darwin: colors.purple[700],
      windows: colors.green[500],
      freebsd: colors.yellow[500],
      netbsd: colors.yellow[600],
      openbsd: colors.yellow[400],
    };
    const osLower = osName.toLowerCase();
    for (const [key, color] of Object.entries(colorMap)) {
      if (osLower == key) {
        return color;
      }
    }
    return colors.gray[500];
  };

  // Get unique OS name+version combinations for X-axis positioning
  const uniqueOSVersions = useMemo(() => {
    return Array.from(new Set(chartData.map((point) => point.osNameVersion)));
  }, [chartData]);

  // Get unique architecture:cores combinations for Y-axis positioning
  const uniqueArchCoreCombos = useMemo(() => {
    return Array.from(new Set(chartData.map((point) => point.archCoreLabel)));
  }, [chartData]);

  // X-axis
  const getOSPosition = (osNameVersion: string) => {
    return uniqueOSVersions.indexOf(osNameVersion);
  };
  // Y-axis
  const getArchCorePosition = (archCoreLabel: string) => {
    return uniqueArchCoreCombos.indexOf(archCoreLabel);
  };

  // Calculate the maximum count for dynamic Z-axis scaling
  const maxCount = useMemo(() => {
    return Math.max(...chartData.map((point) => point.count), 1);
  }, [chartData]);

  // Prepare data for scatter chart
  const scatterData = chartData.map((point) => ({
    x: getOSPosition(point.osNameVersion),
    y: getArchCorePosition(point.archCoreLabel),
    z: point.count,
    color: getOSColor(point.osName),
    point: point,
  }));

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{
      payload: {
        point: ChartDataPoint;
      };
    }>;
  }) => {
    if (active && payload && payload.length && payload[0]) {
      const point = payload[0].payload.point;

      return (
        <div
          style={{
            backgroundColor: colors.slate[800],
            border: `1px solid ${colors.slate[600]}`,
            padding: "8px",
            borderRadius: "4px",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
            fontSize: 12,
            margin: "2px 0",
          }}
        >
          <p style={{ color: colors.slate[100] }}>
            <strong>{point.osNameVersion}</strong>
          </p>
          <p style={{ color: colors.slate[300] }}>{point.archCoreLabel}</p>
          <p style={{ color: colors.slate[300] }}>Systems: {point.count}</p>
        </div>
      );
    }
    return null;
  };

  if (!data || data.length === 0) {
    return (
      <div className="h-50 bg-slate-900 rounded-md pt-2 border border-slate-700 flex items-center justify-center">
        <p className="text-slate-500 text-sm">No system data to display</p>
      </div>
    );
  }

  // need to replace 400 with the maximum count of each Pint
  return (
    <div className="h-50 bg-slate-900 rounded-md pt-2 border border-slate-700">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart
          margin={{ top: 0, right: 12, bottom: 0, left: 8 }}
          data={scatterData}
        >
          <XAxis
            type="number"
            dataKey="x"
            domain={[-0.5, uniqueOSVersions.length - 0.5]}
            tick={{ fill: colors.slate[400], fontSize: 10 }}
            axisLine={{ stroke: colors.slate[600] }}
            tickLine={{ stroke: colors.slate[600] }}
            tickFormatter={(value) => {
              const idx = Math.round(value);
              return uniqueOSVersions[idx] || "";
            }}
            ticks={uniqueOSVersions.map((_, idx) => idx)}
          />
          <YAxis
            type="number"
            dataKey="y"
            domain={[-0.5, uniqueArchCoreCombos.length - 0.5]}
            tick={{ fill: colors.slate[400], fontSize: 10 }}
            axisLine={{ stroke: colors.slate[600] }}
            tickLine={{ stroke: colors.slate[600] }}
            tickFormatter={(value) => {
              const idx = Math.round(value);
              return uniqueArchCoreCombos[idx] || "";
            }}
            ticks={uniqueArchCoreCombos.map((_, idx) => idx)}
          />
          <ZAxis
            type="number"
            dataKey="z"
            range={[1, Math.max(40, maxCount)]}
          />
          <Tooltip content={<CustomTooltip />} cursor={false} />
          <Scatter
            name="Systems"
            data={scatterData}
            onClick={(data) => {
              if (onPointClick && data && data.point) {
                onPointClick(data.point.systems);
              }
            }}
          >
            {scatterData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
