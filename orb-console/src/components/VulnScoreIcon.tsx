interface VulnScoreIconProps {
  score: number;
}

function getScoreColor(score: number): string {
  // Clamp score between 0 and 10
  const clampedScore = Math.max(0, Math.min(10, score));

  // Normalize to 0-1 range (0 = yellow/low risk, 1 = red/high risk)
  const normalized = clampedScore / 10;

  // Define color stops: yellow (low) to red (high)
  const yellow = { r: 234, g: 179, b: 8 }; // yellow-500
  const orange = { r: 249, g: 115, b: 22 }; // orange-500
  const red = { r: 153, g: 27, b: 27 }; // red-800

  let r, g, b;

  if (normalized <= 0.5) {
    // Interpolate between yellow and orange (0.0 to 0.5)
    const t = normalized * 2; // 0 to 1
    r = Math.round(yellow.r + (orange.r - yellow.r) * t);
    g = Math.round(yellow.g + (orange.g - yellow.g) * t);
    b = Math.round(yellow.b + (orange.b - yellow.b) * t);
  } else {
    // Interpolate between orange and red (0.5 to 1.0)
    const t = (normalized - 0.5) * 2; // 0 to 1
    r = Math.round(orange.r + (red.r - orange.r) * t);
    g = Math.round(orange.g + (red.g - orange.g) * t);
    b = Math.round(orange.b + (red.b - orange.b) * t);
  }

  return `rgb(${r}, ${g}, ${b})`;
}

export function VulnScoreIcon({ score }: VulnScoreIconProps) {
  if (score <= 0) return null;

  const backgroundColor = getScoreColor(score);

  return (
    <div
      className="w-5 h-5 rounded-full flex items-center justify-center text-gray-200 text-xs font-semibold ring-1 ring-gray-700 select-none"
      style={{ backgroundColor }}
      title={`CVSS ${score}`}
    >
      {score}
    </div>
  );
}
