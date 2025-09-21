interface VulnScoreIconProps {
  score: number;
}

export function VulnScoreIcon({ score }: VulnScoreIconProps) {
  if (score <= 0) return null;

  return (
    <div
      className={`w-5 h-5 rounded-full flex items-center justify-center text-gray-200 text-xs font-semibold ring-1 ring-gray-700 ${
        score >= 9.0
          ? "bg-red-600"
          : score >= 7.0
            ? "bg-orange-500"
            : score >= 4.0
              ? "bg-yellow-600"
              : "bg-green-600"
      }`}
      title={`CVSS ${score}`}
    >
      {score}
    </div>
  );
}
