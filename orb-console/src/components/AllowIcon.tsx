type AllowIconProps =
  | {
      packageId: number;
      validationSets: {
        unrequired: Set<number>;
        misdefined: Set<number>;
      };
      status?: never;
      onAllowClick?: (status: string) => void;
    }
  | {
      packageId?: never;
      validationSets?: never;
      status: "allowed" | "unrequired" | "misdefined" | "missing";
      onAllowClick?: (status: string) => void;
    };

export function AllowIcon({
  packageId,
  validationSets,
  status,
  onAllowClick,
}: AllowIconProps) {
  let symbol: string;
  let bgColor: string;
  let ringColor: string;
  let title: string;

  // Determine status from props or sets
  const resolvedStatus =
    status ||
    (validationSets?.misdefined.has(packageId!)
      ? "misdefined"
      : validationSets?.unrequired.has(packageId!)
        ? "unrequired"
        : "allowed");

  switch (resolvedStatus) {
    case "misdefined":
      symbol = "!=";
      bgColor = "bg-gray-700";
      ringColor = "ring-gray-600";
      title = "Misdefined";
      break;
    case "unrequired":
      symbol = "!";
      bgColor = "bg-gray-700";
      ringColor = "ring-gray-600";
      title = "Unrequired";
      break;
    case "missing":
      symbol = "?";
      bgColor = "bg-gray-700";
      ringColor = "ring-gray-600";
      title = "Missing";
      break;
    default:
      symbol = "==";
      bgColor = "bg-gray-700";
      ringColor = "ring-gray-600";
      title = "Allowed";
      break;
  }

  const handleClick = () => {
    if (onAllowClick) {
      onAllowClick(resolvedStatus);
    }
  };

  const isClickable = !!onAllowClick;

  return isClickable ? (
    <button
      onClick={handleClick}
      className={`w-4 h-4 rounded-xs flex items-center justify-center font-black text-gray-400 text-sm ring-1 transition-colors hover:bg-gray-600 hover:ring-gray-500 cursor-pointer select-none ${bgColor} ${ringColor}`}
      title={title}
    >
      {symbol}
    </button>
  ) : (
    <div
      className={`w-4 h-4 rounded-xs flex items-center justify-center font-black text-gray-400 text-sm ring-1 select-none ${bgColor} ${ringColor}`}
      title={title}
    >
      {symbol}
    </div>
  );
}
