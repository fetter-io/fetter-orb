type CollapseButtonProps = {
  isExpanded: boolean;
  onToggle: () => void;
  className?: string;
};

export function CollapseButton({
  isExpanded,
  onToggle,
  className = "",
}: CollapseButtonProps) {
  return (
    <button
      title={isExpanded ? "Collapse details" : "Expand details"}
      className={`text-gray-400 hover:text-white cursor-pointer ${className}`}
      onClick={onToggle}
    >
      {isExpanded ? "▼" : "▶"}
    </button>
  );
}
