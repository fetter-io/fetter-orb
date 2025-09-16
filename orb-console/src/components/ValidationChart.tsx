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
  validationSets: {
    missing: ValidationEntry[];
    unrequired: ValidationEntry[];
    misdefined: ValidationEntry[];
    undefined: ValidationEntry[];
  };
  idToPackage: Map<number, { name: string; version: string }>;
};

export function ValidationChart({
  packages,
  validationSets,
  idToPackage,
}: ValidationChartProps) {
  // Count unique package+version combinations (not just unique IDs)
  // Same package with different versions = separate counts
  // Multiple sites with same package+version = single count
  const countUniquePackages = (entries: ValidationEntry[]): number => {
    const uniquePackageVersions = new Set<string>();
    let minusOneCount = 0;

    entries.forEach(([id, ds]) => {
      if (id === -1) {
        // For missing packages, use the DepSpec info if available
        if (ds && ds[0]) {
          uniquePackageVersions.add(`${ds[0]}:${ds[1] || "unknown"}`);
        } else {
          minusOneCount++; // Fallback for malformed missing packages
        }
      } else {
        // For real packages, use idToPackage to get name and version
        const pkg = idToPackage.get(id);
        if (pkg) {
          uniquePackageVersions.add(`${pkg.name}:${pkg.version}`);
        }
      }
    });

    console.log(
      "raw size",
      entries.length,
      "unique pkg:ver combinations",
      uniquePackageVersions.size,
    );
    console.log("unique combinations", Array.from(uniquePackageVersions));
    return uniquePackageVersions.size + minusOneCount;
  };

  // Counts - sum of all package versions across all packages
  const totalPackages = packages?.length || 0;
  const missingCount = countUniquePackages(validationSets?.missing || []);
  const unrequiredCount = countUniquePackages(validationSets?.unrequired || []);
  const misdefinedCount = countUniquePackages(validationSets?.misdefined || []);

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
