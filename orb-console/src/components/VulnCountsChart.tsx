import { AuditEntry } from "@/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import colors from "tailwindcss/colors";

// Helper function to calculate the highest CVSS score for a vulnerability record
const getPackageVulnerabilityScore = (record: any) => {
  const { vuln_ids, vuln_infos } = record;
  let highestScore = 0;

  vuln_ids.forEach((id: string) => {
    const vuln = vuln_infos[id];
    if (!vuln?.cvss_details) return;

    // Sort CVSS details by version (highest first) and take the first one
    const sortedCvss = vuln.cvss_details.sort((a: any, b: any) => {
      const getVersionNumber = (version: string) => {
        const match = version.match(/V(\d+)_(\d+)/);
        if (!match) return 0;
        return parseFloat(`${match[1]}.${match[2]}`);
      };
      return getVersionNumber(b.version) - getVersionNumber(a.version);
    });

    const highestVersionCvss = sortedCvss[0];
    if (highestVersionCvss && highestVersionCvss.score > highestScore) {
      highestScore = highestVersionCvss.score;
    }
  });

  return highestScore;
};

type VulnCountsChartProps = {
  data: AuditEntry[];
};

export function VulnCountsChart({ data }: VulnCountsChartProps) {
  // Create bins for CVSS scores (0-1, 1-2, 2-3, ..., 9-10)
  const bins = Array.from({ length: 10 }, (_, i) => ({
    range: `${i}-${i + 1}`,
    rangeLabel: `${i}.0-${i}.9`,
    count: 0,
    color: i >= 9 ? colors.red[500] : // Critical (9.0+)
           i >= 7 ? colors.orange[500] : // High (7.0-8.9)
           i >= 4 ? colors.yellow[500] : // Medium (4.0-6.9)
           colors.green[500] // Low (0-3.9)
  }));

  // Count vulnerabilities in each bin
  data.forEach((entry) => {
    const score = getPackageVulnerabilityScore(entry.record);
    if (score > 0) {
      const binIndex = Math.min(Math.floor(score), 9); // Cap at 9 for 9.x scores
      bins[binIndex].count++;
    }
  });

  // Filter out empty bins for cleaner display
  const chartData = bins.filter(bin => bin.count > 0);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div
          style={{
            backgroundColor: colors.slate[800],
            border: `1px solid ${colors.slate[600]}`,
            padding: '8px',
            borderRadius: '4px',
          }}
        >
          <p style={{ color: colors.slate[100], fontSize: 12, margin: 0 }}>
            CVSS {label}: {payload[0].value} packages
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-48 bg-slate-900 rounded-md p-2 border border-slate-700">
      <div className="text-sm text-gray-400 mb-2 px-2">Vulnerability Distribution by CVSS Score</div>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <XAxis
            dataKey="rangeLabel"
            tick={{ fill: colors.slate[400], fontSize: 10 }}
            axisLine={{ stroke: colors.slate[600] }}
            tickLine={{ stroke: colors.slate[600] }}
          />
          <YAxis
            tick={{ fill: colors.slate[400], fontSize: 10 }}
            axisLine={{ stroke: colors.slate[600] }}
            tickLine={{ stroke: colors.slate[600] }}
            domain={[0, 'dataMax']}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="count"
            fill={colors.gray[600]}
            stroke={colors.slate[600]}
            strokeWidth={1}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}