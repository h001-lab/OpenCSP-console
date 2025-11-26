// export function Sidebar() {
//   return (
//     <aside className="hidden md:block w-60 border-r bg-white p-4">
//       <nav className="flex flex-col gap-2 text-sm">
//         <a className="hover:bg-gray-100 px-2 py-1 rounded">Dashboard</a>
//         <a className="hover:bg-gray-100 px-2 py-1 rounded">Issues</a>
//         <a className="hover:bg-gray-100 px-2 py-1 rounded">Calendar</a>
//         <a className="hover:bg-gray-100 px-2 py-1 rounded">Settings</a>
//       </nav>
//     </aside>
//   );
// }
"use client";

import Link from "next/link";
import { SideBarItem } from "@/components/types";

export function Sidebar({ items }: { items: SideBarItem[] }) {
  return (
    <aside className="hidden md:block w-60 border-r bg-white p-4">
      <nav className="flex flex-col gap-1 text-sm">
        {items.map((item, idx) => (
          <Link
            key={idx}
            href={item.path}
            className={`
              px-3 py-2 rounded-lg flex items-center gap-2 transition-colors
              ${item.active ? "bg-gray-200 font-medium" : "hover:bg-gray-100"}
            `}
          >
            {item.icon && <span>{item.icon}</span>}
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}