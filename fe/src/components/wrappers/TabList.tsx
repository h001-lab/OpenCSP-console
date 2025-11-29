import { ReactNode } from "react";

export function TabList({ children }: { children: ReactNode }) {
  return (
    <div className="flex border-b border-gray-300 gap-2">
      {children}
    </div>
  );
}