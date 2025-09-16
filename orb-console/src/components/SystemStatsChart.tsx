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
};

type ChartDataPoint = {
  osNameVersion: string;
  architecture: string;
  logicalCores: number;
  archCoreLabel: string;
  count: number;
  systems: SystemTag[];
};

export function SystemStatsChart({ data }: SystemStatsChartProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Group systems by os_name, architecture, and logical_cores
    const groupedData = new Map<string, ChartDataPoint>();

    data.forEach((system) => {
      const osNameVersion = `${system.os_name} ${system.os_version}`;
      const key = `${osNameVersion}-${system.architecture}-${system.logical_cores}`;
      const archCoreLabel = `${system.architecture}: ${system.logical_cores} cores`;
      
      if (groupedData.has(key)) {
        const existing = groupedData.get(key)!;
        existing.count += 1;
        existing.systems.push(system);
      } else {
        groupedData.set(key, {
          osNameVersion,
          architecture: system.architecture,
          logicalCores: system.logical_cores,
          archCoreLabel,
          count: 1,
          systems: [system],
        });
      }
    });

    return Array.from(groupedData.values());
  }, [data]);


  // Color palette for different OS types
  const getOSColor = (osNameVersion: string) => {
    const colorMap: Record<string, string> = {
      // Linux variants
      "linux": colors.blue[500],
      "ubuntu": colors.orange[500],
      "centos": colors.red[500],
      "debian": colors.red[400],
      "fedora": colors.blue[400],
      "rhel": colors.red[600],
      "redhat": colors.red[600],
      // macOS variants
      "darwin": colors.green[500],
      "macos": colors.green[500],
      "mac": colors.green[500],
      "osx": colors.green[500],
      // Windows variants
      "windows": colors.purple[500],
      "win": colors.purple[500],
      // BSD variants
      "freebsd": colors.yellow[500],
      "openbsd": colors.yellow[400],
      "netbsd": colors.yellow[600],
    };
    
    // Convert to lowercase for case-insensitive matching
    const osLower = osNameVersion.toLowerCase();
    
    // Try partial matches against the lowercase OS name
    for (const [key, color] of Object.entries(colorMap)) {
      if (osLower.includes(key)) {
        return color;
      }
    }
    
    // Default to gray for unknown OS
    return colors.gray[500];
  };

  // Get unique OS name+version combinations for X-axis positioning
  const uniqueOSVersions = useMemo(() => {
    return Array.from(new Set(chartData.map(point => point.osNameVersion)));
  }, [chartData]);

  // Get unique architecture:cores combinations for Y-axis positioning
  const uniqueArchCoreCombos = useMemo(() => {
    return Array.from(new Set(chartData.map(point => point.archCoreLabel)));
  }, [chartData]);

  // Convert OS name+version to numeric position for X-axis
  const getOSPosition = (osNameVersion: string) => {
    return uniqueOSVersions.indexOf(osNameVersion);
  };

  // Convert architecture:cores to numeric position for Y-axis
  const getArchCorePosition = (archCoreLabel: string) => {
    return uniqueArchCoreCombos.indexOf(archCoreLabel);
  };

  // Prepare data for scatter chart
  const scatterData = chartData.map((point) => ({
    x: getOSPosition(point.osNameVersion),
    y: getArchCorePosition(point.archCoreLabel),
    z: point.count * 100, // Scale up for visibility
    count: point.count,
    osNameVersion: point.osNameVersion,
    architecture: point.architecture,
    logicalCores: point.logicalCores,
    archCoreLabel: point.archCoreLabel,
    systems: point.systems,
    color: getOSColor(point.osNameVersion),
  }));

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{
      payload: {
        osNameVersion: string;
        architecture: string;
        logicalCores: number;
        archCoreLabel: string;
        count: number;
        systems: SystemTag[];
      };
    }>;
  }) => {
    if (active && payload && payload.length && payload[0]) {
      const data = payload[0].payload;
      
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
          <p style={{ color: colors.slate[100], fontSize: 12, margin: "2px 0" }}>
            <strong>{data.osNameVersion}</strong>
          </p>
          <p style={{ color: colors.slate[300], fontSize: 11, margin: "2px 0" }}>
            {data.archCoreLabel}
          </p>
          <p style={{ color: colors.slate[300], fontSize: 11, margin: "2px 0" }}>
            Systems: {data.count}
          </p>
          {data.systems.length <= 3 && (
            <div style={{ fontSize: 10, color: colors.slate[400], marginTop: "4px" }}>
              {data.systems.map((system, idx) => (
                <div key={idx}>
                  {system.username}@{system.hostname}
                </div>
              ))}
            </div>
          )}
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

  return (
    <div className="h-50 bg-slate-900 rounded-md pt-2 border border-slate-700">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart
          margin={{ top: 20, right: 20, bottom: 40, left: 40 }}
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
          <ZAxis type="number" dataKey="z" range={[50, 400]} />
          <Tooltip
            content={<CustomTooltip />}
            wrapperStyle={{ outline: "none" }}
            cursor={{ strokeDasharray: "3 3" }}
          />
          <Scatter name="Systems" data={scatterData}>
            {scatterData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}