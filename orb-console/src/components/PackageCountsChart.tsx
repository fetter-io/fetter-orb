import { PackageCountsRecord } from "@/types";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type PackageCountsChartProps = {
  data: PackageCountsRecord[];
};

export function PackageCountsChart({ data }: PackageCountsChartProps) {
  const chartData = data.map((entry) => ({
    time: new Date(entry.end).toLocaleTimeString(),
    count: entry.count,
  }));

  return (
    <div className="h-48 bg-slate-900 rounded-md p-2 border border-slate-700">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <XAxis dataKey="time" tick={{ fill: "#94a3b8", fontSize: 12 }} />
          <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="count"
            stroke="#38bdf8"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
