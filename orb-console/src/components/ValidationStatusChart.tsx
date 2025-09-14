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
import { PackageVersions } from "@/types";

type ValidationStatusChartProps = {
  packages: PackageVersions[];
  validationSets: {
    missing: Map<number, string | null>;
    unrequired: Map<number, string | null>;
    misdefined: Map<number, string | null>;
    undefined: Map<number, string | null>;
  };
};

export function ValidationStatusChart({
  packages,
  validationSets,
}: ValidationStatusChartProps) {
  // Calculate counts with safety checks
  const totalPackages = packages?.length || 0;
  const missingCount = validationSets?.missing?.size || 0;
  const unrequiredCount = validationSets?.unrequired?.size || 0;
  const misdefinedCount = validationSets?.misdefined?.size || 0;
  const undefinedCount = validationSets?.undefined?.size || 0;
  
  // Allowed packages = total - unrequired - misdefined
  const allowedCount = Math.max(0, totalPackages - unrequiredCount - misdefinedCount);

  // Helper function to safely calculate percentage
  const safePercentage = (count: number, total: number): number => {
    if (!total || total === 0 || isNaN(count) || isNaN(total)) return 0;
    const result = (count / total) * 100;
    return isNaN(result) ? 0 : Math.max(0, Math.min(100, result));
  };

  // Convert to percentages and ensure all values are valid numbers
  const allowedPercentage = safePercentage(allowedCount, totalPackages);
  const missingPercentage = safePercentage(missingCount, totalPackages);
  const unrequiredPercentage = safePercentage(unrequiredCount, totalPackages);
  const misdefinedPercentage = safePercentage(misdefinedCount, totalPackages);
  const undefinedPercentage = safePercentage(undefinedCount, totalPackages);

  // Double-check all values are valid before creating data
  const data = [
    {
      name: "Status",
      allowed: Number.isFinite(allowedPercentage) ? allowedPercentage : 0,
      missing: Number.isFinite(missingPercentage) ? missingPercentage : 0,
      unrequired: Number.isFinite(unrequiredPercentage) ? unrequiredPercentage : 0,
      misdefined: Number.isFinite(misdefinedPercentage) ? misdefinedPercentage : 0,
      undefined: Number.isFinite(undefinedPercentage) ? undefinedPercentage : 0,
    },
  ];

  // Don't render if no packages or if any data values are invalid
  if (totalPackages === 0) {
    return (
      <div className="h-20 bg-slate-900 rounded-md p-2 border border-slate-700 flex items-center justify-center">
        <p className="text-slate-500 text-sm">No packages to display</p>
      </div>
    );
  }

  // Additional safety check - ensure all data values are valid
  const hasInvalidData = data.some(item => 
    !Number.isFinite(item.allowed) ||
    !Number.isFinite(item.missing) ||
    !Number.isFinite(item.unrequired) ||
    !Number.isFinite(item.misdefined) ||
    !Number.isFinite(item.undefined)
  );

  if (hasInvalidData) {
    console.warn('ValidationStatusChart: Invalid data detected', { data, counts: { totalPackages, allowedCount, missingCount, unrequiredCount, misdefinedCount, undefinedCount } });
    return (
      <div className="h-20 bg-slate-900 rounded-md p-2 border border-slate-700 flex items-center justify-center">
        <p className="text-slate-500 text-sm">Unable to display chart data</p>
      </div>
    );
  }

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ value: number; color: string }>;
    label?: string;
  }) => {
    if (active && payload && payload.length && payload[0]) {
      const count = payload[0].value;
      const percentage = safePercentage(count, totalPackages);
      
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
          <p
            style={{
              color: payload[0].color,
              fontSize: 12,
              margin: "2px 0",
            }}
          >
            {label}: {count} ({percentage.toFixed(1)}%)
          </p>
          <p
            style={{
              color: colors.slate[400],
              fontSize: 11,
              margin: "4px 0 0 0",
              borderTop: `1px solid ${colors.slate[600]}`,
              paddingTop: "4px",
            }}
          >
            Total: {totalPackages} packages
          </p>
        </div>
      );
    }
    return null;
  };

  // Create vertical bar chart data - one bar per category
  const chartData = [
    { name: "Allowed", count: allowedCount, percentage: safePercentage(allowedCount, totalPackages), fill: colors.green[600] },
    { name: "Missing", count: missingCount, percentage: safePercentage(missingCount, totalPackages), fill: colors.yellow[600] },
    { name: "Unrequired", count: unrequiredCount, percentage: safePercentage(unrequiredCount, totalPackages), fill: colors.orange[600] },
    { name: "Misdefined", count: misdefinedCount, percentage: safePercentage(misdefinedCount, totalPackages), fill: colors.red[600] },
    { name: "Undefined", count: undefinedCount, percentage: safePercentage(undefinedCount, totalPackages), fill: colors.gray[600] },
  ];

  // Log data for debugging
  console.log('ValidationStatusChart vertical data:', { chartData, counts: { totalPackages, allowedCount, missingCount, unrequiredCount, misdefinedCount, undefinedCount } });

  return (
    <div className="h-32 bg-slate-900 rounded-md p-2 border border-slate-700">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 5, right: 10, left: 40, bottom: 20 }}
        >
          <XAxis 
            dataKey="name" 
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
          <Bar dataKey="count">
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}