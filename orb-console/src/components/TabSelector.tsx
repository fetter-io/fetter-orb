type Tab = "packages" | "tags" | "other";

type TabSelectorProps = {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
};

export function TabSelector({ activeTab, onTabChange }: TabSelectorProps) {
  const tabs: { id: Tab; label: string }[] = [
    { id: "packages", label: "Packages" },
    { id: "tags", label: "System Tags" },
    { id: "other", label: "{}" },
  ];

  return (
    <div className="grid grid-cols-4 gap-0 text-gray-400 font-semibold">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`transition-all duration-100 text-left px-3 py-1 rounded
              ${
                activeTab === tab.id
                  ? "bg-slate-800 text-gray-100 ring-1 ring-slate-900"
                  : "hover:text-white"
              }`}
        >
          {tab.label}
        </button>
      ))}
      {/* Empty 4th column for spacing */}
      <div></div>
    </div>
  );
}
