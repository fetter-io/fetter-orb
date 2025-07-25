type WaveDividerProps = {
  className?: string;
  height?: number; // in pixels
  controlPoints?: [number, number, number, number]; // [x1, y1, x2, y2]
  fillClass?: string; // Tailwind class for fill color
  flip?: boolean; // whether to flip the wave vertically
};

export function WaveDivider({
  className = "",
  height = 50,
  controlPoints = [300, 35, 1140, 15],
  fillClass = "text-slate-800",
  flip = false,
}: WaveDividerProps) {
  const [x1, y1, x2, y2] = controlPoints;
  const svgHeight = height;
  const svgViewBox = `0 0 1440 ${svgHeight}`;
  const pathData = `M0,${svgHeight} C${x1},${y1} ${x2},${y2} 1440,${svgHeight} L1440,0 L0,0 Z`;

  return (
    <div className={`overflow-hidden leading-none ${className}`}>
      <svg
        viewBox={svgViewBox}
        preserveAspectRatio="none"
        className={`w-full h-[${svgHeight}px] ${fillClass} ${
          flip ? "rotate-180" : ""
        }`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <path fill="currentColor" d={pathData} />
      </svg>
    </div>
  );
}
