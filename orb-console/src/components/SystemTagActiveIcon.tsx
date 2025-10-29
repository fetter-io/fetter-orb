type SystemTagActiveIconProps = {
  active: boolean;
  isUpdating: boolean;
  onToggle: () => void;
};

export function SystemTagActiveIcon({
  active,
  isUpdating,
  onToggle,
}: SystemTagActiveIconProps) {
  return (
    <button
      title={active ? "Deactivate system" : "Activate system"}
      className={`w-4 h-4 bg-gray-900 flex-shrink-0 overflow-visible text-clip rounded-xs flex items-center justify-center ring-1 ring-gray-600 font-black hover:bg-gray-600 cursor-pointer transition-colors ${
        active ? "text-green-600" : "text-red-400"
      } ${isUpdating ? "opacity-50 cursor-not-allowed" : ""}`}
      onClick={onToggle}
      disabled={isUpdating}
    >
      {active ? "●" : "○"}
    </button>
  );
}
