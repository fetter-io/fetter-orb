import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  TooltipProps,
} from "recharts";
import colors from "tailwindcss/colors";
import { PackageVersions, ValidationEntry } from "@/types";

type ValidationChartProps = {
  packages: PackageVersions[];
  validationEntries: {
    missing: ValidationEntry[];
    unrequired: ValidationEntry[];
    misdefined: ValidationEntry[];
  };
};

export function ValidationChart({
  packages,
  validationEntries,
}: ValidationChartProps) {
  // counts here are of package, version, site; this is higher than the number of packages displayed
  const totalPackages =
    packages?.reduce((sum, pkg) => sum + (pkg.data?.length || 0), 0) || 0;
  const missingCount = validationEntries?.missing.length || 0;
  const unrequiredCount = validationEntries?.unrequired.length || 0;
  const misdefinedCount = validationEntries?.misdefined.length || 0;

  // Allowed = total - unrequired - misdefined
  const allowedCount = Math.max(
    0,
    totalPackages - (unrequiredCount + misdefinedCount),
  );

  if (totalPackages === 0) {
    return (
      <div className="h-20 bg-slate-900 rounded-md p-2 border border-slate-700 flex items-center justify-center">
        <p className="text-slate-500 text-sm">No packages to display</p>
      </div>
    );
  }

  const chartData = [
    { name: "Missing", count: missingCount, fill: colors.orange[600] },
    { name: "Misdefined", count: misdefinedCount, fill: colors.red[700] },
    { name: "Unrequired", count: unrequiredCount, fill: colors.yellow[500] },
    { name: "Allowed", count: allowedCount, fill: colors.green[700] },
    { name: "Total", count: totalPackages, fill: colors.gray[600] },
  ];

  const CustomTooltip = ({ active, payload }: TooltipProps<number, string>) => {
    if (active && payload && payload.length && payload[0]) {
      const data = payload[0];
      const value = data.value;
      const name = data.payload?.name;

      if (typeof value === "number" && name) {
        const pct =
          totalPackages > 0
            ? ((value / totalPackages) * 100).toFixed(1)
            : "0.0";

        return (
          <div
            style={{
              backgroundColor: colors.slate[800],
              border: `1px solid ${colors.slate[600]}`,
              fontSize: 10,
              padding: "8px",
              borderRadius: "4px",
              color: colors.slate[400],
            }}
          >
            <p style={{ margin: 0, color: colors.slate[400] }}>
              {name}: {value} ({pct}%)
            </p>
          </div>
        );
      }
    }
    return null;
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
            width={90} // ensure full label space
            tick={{ fill: colors.slate[400], fontSize: 12 }}
            axisLine={{ stroke: colors.slate[600] }}
            tickLine={{ stroke: colors.slate[600] }}
          />
          <Tooltip
            content={<CustomTooltip />}
            wrapperStyle={{ outline: "none" }}
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
