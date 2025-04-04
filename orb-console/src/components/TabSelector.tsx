export function TabSelector({ activeTab, onTabChange }: TabSelectorProps) {
    return (
      <div className="flex gap-4 text-gray-500">
        <button
          className={`transition hover:text-gray-400 ${
            activeTab === "packages" ? "font-bold text-gray-400" : ""
          }`}
          onClick={() => onTabChange("packages")}
        >
          Packages
        </button>
        <button
          className={`transition hover:text-gray-400 ${
            activeTab === "tags" ? "font-bold text-gray-400" : ""
          }`}
          onClick={() => onTabChange("tags")}
        >
          System Tags
        </button>
        <button
          className={`transition hover:text-gray-400 ${
            activeTab === "other" ? "font-bold text-gray-400" : ""
          }`}
          onClick={() => onTabChange("other")}
        >
          Something Else
        </button>
      </div>
    );
  }
