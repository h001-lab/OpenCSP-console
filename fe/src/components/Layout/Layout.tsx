"use client";

import { usePathname } from "next/navigation";
import { NotificationBanner } from "@h001/ui";
import { Link, useMsg } from "@/providers/MessagesProvider";
import { PropsWithChildren } from "react";
import { useBanner } from "@/hooks/useBanner";
import { TopBar } from "@/components/Layout/TopBar";
import { AppSidebar, SidebarItem } from "@/components/Layout/Sidebar";
import { ChevronRight } from "lucide-react";

export interface LayoutProps extends PropsWithChildren {
  navDomain: string;
  sidebarDomain: string;
}

interface ComponentsMessage {
  Banner: {
    linkLabel: string;
    storageKey: string;
  };
}

interface NavMessage {
  title: string;
}

interface SidebarMessage {
  title?: string;
  sidebar: SidebarItem[];
}

function CrumbBar({ sidebarDomain }: { sidebarDomain: string }) {
  const pathname = usePathname();
  const t = useMsg(sidebarDomain) as unknown as SidebarMessage | undefined;

  const withoutLocale = pathname.replace(/^\/[a-z]{2}(-[A-Z]{2})?/, "") || "/";
  const segments = withoutLocale.split("/").filter(Boolean);

  const activeItem = t?.sidebar.find((item) => {
    if (item.path === "/") return withoutLocale === "/";
    return withoutLocale === item.path || withoutLocale.startsWith(item.path + "/");
  });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: "var(--crumb-h)",
        padding: "0 24px",
        background: "var(--bg-surface)",
        borderBottom: "1px solid var(--border-1)",
      }}
    >
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          fontSize: "12.5px",
          color: "var(--fg-muted)",
        }}
      >
        <Link href="/" style={{ color: "var(--fg-muted)", textDecoration: "none" }}>
          Home
        </Link>
        {segments.map((seg, i) => {
          const segPath = "/" + segments.slice(0, i + 1).join("/");
          const isLast = i === segments.length - 1;
          const label =
            isLast && activeItem
              ? activeItem.label
              : seg.charAt(0).toUpperCase() + seg.slice(1);
          return (
            <span key={segPath} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <ChevronRight size={12} style={{ color: "var(--border-strong)" }} />
              {isLast ? (
                <span style={{ color: "var(--fg-primary)", fontWeight: 500 }}>{label}</span>
              ) : (
                <Link href={segPath} style={{ color: "var(--fg-muted)", textDecoration: "none" }}>
                  {label}
                </Link>
              )}
            </span>
          );
        })}
      </nav>
    </div>
  );
}

export default function Layout({
  children,
  navDomain,
  sidebarDomain,
}: LayoutProps) {
  const nav = useMsg(navDomain) as unknown as NavMessage | null;
  const components = useMsg("Components") as unknown as ComponentsMessage | null;
  const t = useMsg(sidebarDomain) as unknown as SidebarMessage | null;
  const banner = useBanner();

  if (!nav || !t || !components) return null;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateRows: "var(--topbar-h) 1fr",
        height: "100vh",
        background: "var(--bg-app)",
      }}
    >
      {banner.message && (
        <NotificationBanner
          linkLabel={components.Banner.linkLabel}
          linkHref={banner.link || undefined}
          storageKey={`banner-${banner.message.slice(0, 50)}`}
        >
          {banner.message}
        </NotificationBanner>
      )}

      <TopBar />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        <AppSidebar title={t.title} items={t.sidebar} />

        <div
          style={{
            display: "grid",
            gridTemplateRows: "var(--crumb-h) 1fr",
            minWidth: 0,
            overflow: "hidden",
            background: "var(--bg-section)",
          }}
        >
          <CrumbBar sidebarDomain={sidebarDomain} />
          <main
            style={{
              overflowY: "auto",
              padding: "20px 24px 40px",
            }}
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
