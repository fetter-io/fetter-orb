interface VulnScoreIconProps {
  score: number;
}

export function VulnScoreIcon({ score }: VulnScoreIconProps) {
  if (score <= 0) return null;

  return (
    <div
      className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${
        score >= 9.0 ? 'bg-red-600' :
        score >= 7.0 ? 'bg-orange-500' :
        score >= 4.0 ? 'bg-yellow-500' :
        'bg-green-600'
      }`}
      title={`CVSS ${score}`}
    >
      {score}
    </div>
  );
}