import { useTabs } from "./Tabs";

interface TabProps {
  id: string;
  children: React.ReactNode;
}

export function Tab({ id, children }: TabProps) {
  const { activeTab, setActiveTab } = useTabs();

  const isActive = activeTab === id;

  return (
    <button
      className={`
        px-3 py-2 text-sm border-b-2 
        ${isActive ? "border-blue-600 text-blue-600 font-medium" : "border-transparent text-gray-600"} 
        hover:text-gray-800
      `}
      onClick={() => setActiveTab(id)}
    >
      {children}
    </button>
  );
}