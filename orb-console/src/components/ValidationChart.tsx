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

type ValidationChartProps = {
  packageCounts: {
    total: number;
    missing: number;
    unrequired: number;
    misdefined: number;
    allowed: number;
  };
  onAllowClick?: (status: string) => void;
};

export function ValidationChart({ packageCounts, onAllowClick }: ValidationChartProps) {
  const {
    total: totalPackages,
    missing: missingCount,
    unrequired: unrequiredCount,
    misdefined: misdefinedCount,
    allowed: allowedCount,
  } = packageCounts;

  if (totalPackages === 0) {
    return (
      <div className="h-20 bg-slate-900 rounded-md p-2 border border-slate-700 flex items-center justify-center">
        <p className="text-slate-500 text-sm">No packages to display</p>
      </div>
    );
  }

  const chartData = [
    { name: "Missing", count: missingCount, fill: colors.orange[600], status: "missing" },
    { name: "Misdefined", count: misdefinedCount, fill: colors.red[700], status: "misdefined" },
    { name: "Unrequired", count: unrequiredCount, fill: colors.yellow[500], status: "unrequired" },
    { name: "Allowed", count: allowedCount, fill: colors.green[700], status: "allowed" },
    { name: "Total", count: totalPackages, fill: colors.gray[600], status: "total" },
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
            {onAllowClick && name !== "Total" && (
              <p style={{ margin: 0, color: colors.slate[500], fontSize: 9, fontStyle: "italic" }}>
                Click to view section
              </p>
            )}
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
          <Bar 
            dataKey="count" 
            barSize={10} 
            radius={[2, 2, 2, 2]}
            onClick={(data) => {
              if (onAllowClick && data && data.status && data.status !== "total") {
                onAllowClick(data.status);
              }
            }}
          >
            {chartData.map((entry, i) => (
              <Cell 
                key={`cell-${i}`} 
                fill={entry.fill}
                style={{ 
                  cursor: onAllowClick && entry.status !== "total" ? "pointer" : "default" 
                }}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
