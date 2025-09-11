import { PackageCountsRecord } from "@/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Brush,
  ResponsiveContainer,
} from "recharts";
import colors from "tailwindcss/colors";

type PackageCountsChartProps = {
  data: PackageCountsRecord[];
};

export function PackageCountsChart({ data }: PackageCountsChartProps) {
  const chartData = data
    .filter((entry) => entry.start && !isNaN(new Date(entry.start).getTime()))
    .map((entry) => {
      const start = new Date(entry.start);
      const date = start.toLocaleDateString(); // e.g. 04/07/2025
      const time = start.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }); // e.g. 17:04
      return {
        time: `${date}\n${time}`, // line break for two-line X axis
        count: entry.count,
      };
    });

  return (
    <div className="h-50 bg-slate-900 rounded-md p-2 border border-slate-700">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 5, right: 10, left: 0, bottom: 10 }}
        >
          <XAxis
            dataKey="time"
            tick={({ x, y, payload }) => {
              const [date, time] = payload.value.split("\n");
              return (
                <g transform={`translate(${x},${y + 10})`}>
                  <text
                    fill={colors.slate[400]}
                    fontSize={10}
                    textAnchor="middle"
                  >
                    <tspan x={0} dy="0">
                      {date}
                    </tspan>
                    <tspan x={0} dy="12">
                      {time}
                    </tspan>
                  </text>
                </g>
              );
            }}
          />

          <YAxis
            tick={{ fill: colors.slate[400], fontSize: 10 }}
            domain={["auto", "auto"]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: colors.slate[800],
              borderColor: colors.slate[600],
            }}
            labelStyle={{
              color: colors.slate[100],
              fontSize: 10,
            }}
            itemStyle={{
              color: colors.slate[100],
              fontSize: 10,
            }}
            cursor={{ fill: colors.slate[800] }}
          />
          <Bar dataKey="count" fill={colors.gray[600]} />
          <Brush
            dataKey="time"
            height={10}
            stroke={colors.gray[700]}
            fill={colors.slate[600]}
            travellerWidth={10}
            tickFormatter={() => ""} // hide labels
            y={172} // manually push the brush down
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
