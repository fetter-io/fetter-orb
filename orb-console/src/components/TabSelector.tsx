import { Tab } from "@/types";

type TabSelectorProps = {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
};

export function TabSelector({ activeTab, onTabChange }: TabSelectorProps) {
  const tabs: { id: Tab; label: string }[] = [
    { id: "packages", label: "Packages" },
    { id: "tags", label: "Systems" },
    { id: "allow", label: "Allow" },
    { id: "vulns", label: "Vulnerabilities" },
  ];

  return (
    <div className="grid grid-cols-4 gap-0 text-gray-600 font-semibold">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`transition-all duration-100 text-center px-3 py-1 rounded
              ${
                activeTab === tab.id
                  ? "bg-slate-800 text-gray-400 ring-1 ring-slate-900"
                  : "hover:text-gray-300"
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
