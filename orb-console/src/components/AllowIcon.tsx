type AllowIconProps =
  | {
      packageId: number;
      validationSets: {
        unrequired: Set<number>;
        misdefined: Set<number>;
      };
      status?: never;
    }
  | {
      packageId?: never;
      validationSets?: never;
      status: "allowed" | "unrequired" | "misdefined" | "missing";
    };

export function AllowIcon({ packageId, validationSets, status }: AllowIconProps) {
  let symbol: string;
  let bgColor: string;
  let ringColor: string;
  let title: string;

  // Determine status from props or sets
  const resolvedStatus = status ||
    (validationSets?.misdefined.has(packageId!) ? "misdefined" :
     validationSets?.unrequired.has(packageId!) ? "unrequired" : "allowed");

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

  return (
    <div
      className={`w-5 h-5 rounded-xs flex items-center justify-center font-black text-gray-400 text-sm ring-1 ${bgColor} ${ringColor}`}
      title={title}
    >
      {symbol}
    </div>
  );
}
