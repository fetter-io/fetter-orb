import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
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

  // Single-row dataset for 100% horizontal stacked bar
  const data = [
    {
      label: "All Packages",
      allowed: allowedCount,
      missing: missingCount,
      unrequired: unrequiredCount,
      misdefined: misdefinedCount,
      undefined: undefinedCount,
    },
  ];

  const tooltipFormatter = (value: number, name: string) => {
    const pct =
      totalPackages > 0 ? ((value / totalPackages) * 100).toFixed(1) : "0.0";
    // Capitalize key nicely
    const label =
      name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, " ");
    return [`${value} (${pct}%)`, label];
  };

  return (
    <div
      className="h-30 bg-slate-900 rounded-md p-2 border border-slate-700"
      aria-label="Validation summary (100% stacked)"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          stackOffset="expand"
          margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
          barCategoryGap="0%"
          barGap={0}
        >
          {/* Show horizontal % axis */}
          <XAxis
            type="number"
            domain={[0, 1]}
            tickFormatter={(v) => `${Math.round(v * 100)}%`}
            tick={{ fill: colors.slate[400], fontSize: 10 }}
            axisLine={{ stroke: colors.slate[600] }}
            tickLine={{ stroke: colors.slate[600] }}
          />
          <YAxis type="category" dataKey="label" hide />
          <Tooltip
            formatter={tooltipFormatter}
            labelFormatter={() => `Total: ${totalPackages} packages`}
            wrapperStyle={{ outline: "none" }}
            contentStyle={{
              fontSize: 10,
              backgroundColor: colors.slate[800],
              border: `1px solid ${colors.slate[600]}`,
            }}
            cursor={{ fill: "transparent" }}
          />
          x
          <Bar
            dataKey="allowed"
            stackId="1"
            fill={colors.green[700]}
            barSize={18}
            fillOpacity={0.6}
            background={{
              fill: colors.slate[700],
              stroke: colors.slate[700], // outline color
              strokeWidth: 3, // outline thickness
            }}
          />
          <Bar dataKey="missing" fillOpacity={0.6} stackId="1" fill={colors.yellow[600]} />
          <Bar dataKey="unrequired" fillOpacity={0.6} stackId="1" fill={colors.orange[400]} />
          <Bar dataKey="misdefined" fillOpacity={0.6} stackId="1" fill={colors.red[700]} />
          <Bar dataKey="undefined" fillOpacity={0.6} stackId="1" fill={colors.gray[600]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
