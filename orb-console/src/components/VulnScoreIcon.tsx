interface VulnScoreIconProps {
  score: number;
}

export function VulnScoreIcon({ score }: VulnScoreIconProps) {
  if (score <= 0) return null;

  return (
    <div
      className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ring-1 ${
        score >= 9.0
          ? "bg-red-600 ring-red-700"
          : score >= 7.0
            ? "bg-orange-500 ring-orange-600"
            : score >= 4.0
              ? "bg-yellow-600 ring-yellow-700"
              : "bg-green-600 ring-green-700"
      }`}
      title={`CVSS ${score}`}
    >
      {score}
    </div>
  );
}
