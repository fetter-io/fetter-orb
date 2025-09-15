import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import colors from "tailwindcss/colors";
import { PackageVersions } from "@/types";

type ValidationChartProps = {
  packages: PackageVersions[];
  validationSets: {
    missing: Map<number, string | null>;
    unrequired: Map<number, string | null>;
    misdefined: Map<number, string | null>;
    undefined: Map<number, string | null>;
  };
};

export function ValidationChart({
  packages,
  validationSets,
}: ValidationChartProps) {
  // Counts
  const totalPackages = packages?.length || 0;
  const missingCount = validationSets?.missing?.size || 0;
  const unrequiredCount = validationSets?.unrequired?.size || 0;
  const misdefinedCount = validationSets?.misdefined?.size || 0;
  const undefinedCount = validationSets?.undefined?.size || 0;

  // Allowed = total - unrequired - misdefined
  const allowedCount = Math.max(
    0,
    totalPackages - unrequiredCount - misdefinedCount,
  );

  if (totalPackages === 0) {
    return (
      <div className="h-20 bg-slate-900 rounded-md p-2 border border-slate-700 flex items-center justify-center">
        <p className="text-slate-500 text-sm">No packages to display</p>
      </div>
    );
  }

  const chartData = [
    { name: "Allowed",   count: allowedCount,   fill: colors.green[700] },
    { name: "Missing",   count: missingCount,   fill: colors.yellow[600] },
    { name: "Unrequired",count: unrequiredCount,fill: colors.orange[400] },
    { name: "Misdefined",count: misdefinedCount,fill: colors.red[700] },
    { name: "Undefined", count: undefinedCount, fill: colors.gray[600] },
  ];

  const tooltipFormatter = (value: number, name: string, entry: any) => {
    const pct =
      totalPackages > 0 ? ((value / totalPackages) * 100).toFixed(1) : "0.0";
    return [`${value} (${pct}%)`, entry?.payload?.name ?? name];
  };

  return (
    <div
      className="h-50 bg-slate-900 rounded-md p-2 border border-slate-700"
      aria-label="Validation summary (horizontal bars)"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
          barCategoryGap={8}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={colors.slate[700]} />
          {/* Horizontal axis = counts */}
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fill: colors.slate[400], fontSize: 10 }}
            axisLine={{ stroke: colors.slate[600] }}
            tickLine={{ stroke: colors.slate[600] }}
            domain={[0, "dataMax"]}
          />
          {/* Left labels for each bar */}
          <YAxis
            type="category"
            dataKey="name"
            width={96} // ensure full label space
            tick={{ fill: colors.slate[300], fontSize: 12 }}
            axisLine={{ stroke: colors.slate[600] }}
            tickLine={{ stroke: colors.slate[600] }}
          />
          <Tooltip
            formatter={tooltipFormatter}
            wrapperStyle={{ outline: "none" }}
            contentStyle={{
              backgroundColor: colors.slate[800],
              border: `1px solid ${colors.slate[600]}`,
              fontSize: 10,
            }}
            cursor={{ fill: "transparent" }}
          />
          <Bar dataKey="count" barSize={14} radius={[2, 2, 2, 2]}>
            {chartData.map((entry, i) => (
              <Cell key={`cell-${i}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
