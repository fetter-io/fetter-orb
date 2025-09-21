import { Tab } from "@/types";

type TabSelectorProps = {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
};

export function TabSelector({ activeTab, onTabChange }: TabSelectorProps) {
  const tabs: { id: Tab; label: string; tooltip: string }[] = [
    { id: "packages", label: "📦", tooltip: "Packages" },
    { id: "vulns", label: "⚠️", tooltip: "Vulnerabilities" },
    { id: "allow", label: "🔓", tooltip: "Allow List" },
    { id: "systems", label: "🖥️", tooltip: "Systems" },
    { id: "tenant", label: "🏢", tooltip: "Tenants" },
    { id: "account", label: "⚙️", tooltip: "Account" },
  ];

  const activeTabName = tabs.find((tab) => tab.id === activeTab)?.tooltip;

  return (
    <div>
      <div className="bg-slate-800 rounded-sm px-2 py-0 border border-gray-700">
        <div className="grid grid-cols-6 gap-0 text-gray-600 font-semibold">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              title={tab.tooltip}
              onClick={() => onTabChange(tab.id)}
              className={`transition-all duration-200 text-center px-3 py-1 break-words whitespace-normal
                ${
                  activeTab === tab.id
                    ? "bg-slate-900 text-gray-400 ring-1 ring-slate-700"
                    : "hover:bg-slate-700 hover:text-gray-300 cursor-pointer"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div className="text-center">
        <span className="text-gray-500 text-xs uppercase tracking-widest">
          {activeTabName}
        </span>
      </div>
    </div>
  );
}
