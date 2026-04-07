"use client";

import { usePathname } from "next/navigation";
import Layout from "@/components/Layout/Layout";
import { Link, useMsg } from "@/providers/MessagesProvider";
import { useAdminProtection } from "@/hooks/useAdminProtection";
import { useTypedMsg } from "@/hooks/useTypedMsg";
import { IntegrationsMessages } from "./types";

interface AdminMsg {
  integrations: IntegrationsMessages;
}

const TABS = [
  { key: "nodes",   href: "/admin/integrations/nodes" },
  { key: "core",    href: "/admin/integrations/core" },
  { key: "console", href: "/admin/integrations/console" },
] as const;

export default function IntegrationsLayout({ children }: { children: React.ReactNode }) {
  const isAdmin = useAdminProtection();
  const adminMsg = useTypedMsg<AdminMsg>("Admin");
  const pathname = usePathname();

  if (!isAdmin || !adminMsg) return null;

  const t = adminMsg.integrations;

  return (
    <Layout navDomain="Nav" sidebarDomain="Admin">
      <main className="p-3 gap-3">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-700 mb-1">{t.title}</h2>
          <p className="text-xs text-gray-500">{t.description}</p>
          <hr className="mt-2" />
        </div>

        <div className="flex gap-0 border-b mb-4">
          {TABS.map(tab => {
            const isActive = pathname.endsWith(`/integrations/${tab.key}`);
            return (
              <Link
                key={tab.key}
                href={tab.href}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  isActive
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {t.tabs[tab.key]}
              </Link>
            );
          })}
        </div>

        {children}
      </main>
    </Layout>
  );
}
