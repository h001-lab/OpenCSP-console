"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import {
  Server,
  Network,
  ShieldCheck,
  HardDrive,
  Archive,
  Users,
  BarChart2,
  CreditCard,
  Settings,
  Home,
  LayoutDashboard,
  Newspaper,
  ChevronLeft,
  ChevronRight,
  Wrench,
  Building2,
  LucideIcon,
} from "lucide-react";
import { Link } from "@/providers/MessagesProvider";

export interface SidebarItem {
  label: string;
  path: string;
  icon?: React.ReactNode;
}

interface SidebarProps {
  title?: string;
  items: SidebarItem[];
}

const PATH_ICONS: Record<string, LucideIcon> = {
  "/": Home,
  "/dashboard": LayoutDashboard,
  "/instances": Server,
  "/network": Network,
  "/firewall": ShieldCheck,
  "/volumes": HardDrive,
  "/backups": Archive,
  "/iam": Users,
  "/monitoring": BarChart2,
  "/billing": CreditCard,
  "/settings": Settings,
  "/news": Newspaper,
  "/admin": Building2,
  "/admin/users": Users,
  "/admin/integrations": Wrench,
  "/admin/infrastructure": Server,
  "/admin/settings": Settings,
};

const STORAGE_KEY = "sidebar-collapsed";

function getIcon(path: string): LucideIcon {
  if (PATH_ICONS[path]) return PATH_ICONS[path];
  const segment = "/" + path.split("/").filter(Boolean)[0];
  return PATH_ICONS[segment] ?? LayoutDashboard;
}

export function AppSidebar({ title, items }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === "true";
    } catch {
      return false;
    }
  });

  const toggle = () => {
    setCollapsed((v) => {
      const next = !v;
      try { localStorage.setItem(STORAGE_KEY, String(next)); } catch {}
      return next;
    });
  };

  const isActive = (path: string) => {
    const withoutLocale = pathname.replace(/^\/[a-z]{2}(-[A-Z]{2})?/, "") || "/";
    if (path === "/") return withoutLocale === "/";
    return withoutLocale === path || withoutLocale.startsWith(path + "/");
  };

  return (
    <aside
      data-collapsed={collapsed}
      style={{
        width: collapsed ? "var(--sidebar-w-collapsed)" : "var(--sidebar-w)",
        minWidth: collapsed ? "var(--sidebar-w-collapsed)" : "var(--sidebar-w)",
        background: "var(--bg-surface)",
        borderRight: "1px solid var(--border-1)",
        display: "flex",
        flexDirection: "column",
        transition: "width 160ms ease, min-width 160ms ease",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          padding: "12px 12px 8px",
        }}
      >
        {!collapsed && title && (
          <span
            style={{
              fontSize: "11px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--fg-muted)",
            }}
          >
            {title}
          </span>
        )}
        <button
          onClick={toggle}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          style={{
            width: "24px",
            height: "24px",
            display: "grid",
            placeItems: "center",
            borderRadius: "var(--r-xs)",
            color: "var(--fg-muted)",
            cursor: "pointer",
            background: "transparent",
            border: "none",
            flexShrink: 0,
          }}
          className="sidebar-collapse-btn"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Nav items */}
      <nav style={{ padding: "2px 8px 12px", overflowY: "auto", flex: 1 }}>
        {items.map((item) => {
          const active = isActive(item.path);
          const Icon = getIcon(item.path);
          return (
            <Link
              key={item.path}
              href={item.path}
              title={collapsed ? item.label : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                gap: collapsed ? 0 : "10px",
                height: "30px",
                padding: collapsed ? "0" : "0 8px",
                justifyContent: collapsed ? "center" : undefined,
                borderRadius: "var(--r-sm)",
                color: active ? "var(--brand-600)" : "var(--fg-secondary)",
                fontSize: "12.5px",
                fontWeight: active ? 600 : 400,
                textDecoration: "none",
                position: "relative",
                background: active ? "var(--bg-active)" : "transparent",
                marginBottom: "2px",
              }}
              className={active ? "sidebar-link-active" : "sidebar-link"}
            >
              {active && (
                <span
                  style={{
                    position: "absolute",
                    left: "-8px",
                    top: "6px",
                    bottom: "6px",
                    width: "3px",
                    background: "var(--brand-600)",
                    borderRadius: "0 2px 2px 0",
                  }}
                />
              )}
              <Icon
                size={15}
                style={{
                  flexShrink: 0,
                  color: active ? "var(--brand-600)" : "var(--fg-muted)",
                }}
              />
              {!collapsed && (
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <style>{`
        .sidebar-link:hover {
          background: var(--bg-hover) !important;
          color: var(--fg-primary) !important;
        }
        .sidebar-link:hover svg { color: var(--fg-primary) !important; }
        .sidebar-collapse-btn:hover { background: var(--bg-hover) !important; color: var(--fg-primary) !important; }
      `}</style>
    </aside>
  );
}
