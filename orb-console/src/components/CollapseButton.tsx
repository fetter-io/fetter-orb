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
      className={`w-4 h-4 mr-2 bg-gray-800 flex-shrink-0 overflow-visible text-clip rounded-xs flex items-center justify-center ring-1 ring-gray-600 font-black text-gray-400 hover:text-white cursor-pointer ${className}`}
      onClick={onToggle}
    >
      {isExpanded ? "－" : "＋"}
    </button>
  );
}
