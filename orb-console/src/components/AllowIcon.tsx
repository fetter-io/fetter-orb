type AllowIconProps = {
  packageId: number;
  validationSets: {
    unrequired: Set<number>;
    misdefined: Set<number>;
  };
};

export function AllowIcon({ packageId, validationSets }: AllowIconProps) {
  let symbol: string;
  let bgColor: string;
  let ringColor: string;
  let title: string;

  if (validationSets.misdefined.has(packageId)) {
    symbol = "≈";
    bgColor = "bg-gray-700";
    ringColor = "ring-gray-600";
    title = "Misdefined";
  } else if (validationSets.unrequired.has(packageId)) {
    symbol = "⊖";
    bgColor = "bg-gray-700";
    ringColor = "ring-gray-600";
    title = "Unrequired";
  } else {
    symbol = "✓";
    bgColor = "bg-gray-700";
    ringColor = "ring-gray-600";
    title = "Allowed";
  }

  return (
    <div
      className={`w-5 h-5 rounded-xs flex items-center justify-center text-gray-300 text-sm ring-1 ${bgColor} ${ringColor}`}
      title={title}
    >
      {symbol}
    </div>
  );
}
