"use client";

import { usePathname } from "next/navigation";
import Layout from "@/components/Layout/Layout";
import { Link } from "@/providers/MessagesProvider";
import { useAdminProtection } from "@/hooks/useAdminProtection";
import { useTypedMsg } from "@/hooks/useTypedMsg";
import { IntegrationsMessages } from "./types";
import { PageHeader } from "@/components/ui/page-header";

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
      <PageHeader title={t.title} subtitle={t.description} />

      <div style={{ display: "flex", borderBottom: "1px solid var(--border-1)", marginBottom: "20px" }}>
        {TABS.map(tab => {
          const isActive = pathname.endsWith(`/integrations/${tab.key}`);
          return (
            <Link
              key={tab.key}
              href={tab.href}
              style={{
                padding: "8px 16px",
                fontSize: "13px",
                fontWeight: isActive ? 600 : 400,
                color: isActive ? "var(--brand-600)" : "var(--fg-muted)",
                textDecoration: "none",
                borderBottom: isActive ? "2px solid var(--brand-600)" : "2px solid transparent",
                marginBottom: "-1px",
                transition: "color 150ms",
              }}
              className="integrations-tab"
            >
              {t.tabs[tab.key]}
            </Link>
          );
        })}
      </div>
      <style>{`.integrations-tab:hover { color: var(--fg-primary) !important; }`}</style>

      {children}
    </Layout>
  );
}
