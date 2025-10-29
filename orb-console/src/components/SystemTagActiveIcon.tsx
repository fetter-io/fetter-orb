import colors from "tailwindcss/colors";

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
      className={`w-4 h-4 bg-gray-900 flex-shrink-0 rounded-xs flex items-center justify-center ring-1 ring-gray-600 hover:bg-gray-600 cursor-pointer transition-colors ${
        isUpdating ? "opacity-50 cursor-not-allowed" : ""
      }`}
      onClick={onToggle}
      disabled={isUpdating}
    >
      {active ? (
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="6" cy="6" r="3" fill={colors.green[700]} />
        </svg>
      ) : (
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="6" cy="6" r="3" fill={colors.red[400]} />

        </svg>
      )}
    </button>
  );
}
