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
      <div className="bg-gradient-to-b from-slate-800 to-slate-900 px-0 py-0 border border-gray-700">
        <div className="grid grid-cols-6 gap-0 text-gray-600 font-semibold">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              title={tab.tooltip}
              onClick={() => onTabChange(tab.id)}
              className={`transition-all duration-200 text-center px-3 py-1 break-words whitespace-normal
                ${
                  activeTab === tab.id
                    ? "bg-gradient-to-b from-slate-900 to-slate-950 ring-1 ring-slate-700"
                    : "bg-gradient-to-b from-transparent to-transparent hover:from-slate-700 hover:to-slate-800 cursor-pointer"
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
