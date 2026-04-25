"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Bell, ChevronDown, Grid3x3, LogOut, Settings, CreditCard, LayoutDashboard, ShieldCheck } from "lucide-react";
import { signIn, signOut, useSession } from "next-auth/react";
import { useAuthStore } from "@/stores/authStore";
import { Link, useMsg } from "@/providers/MessagesProvider";
import { ROUTES } from "@/lib/routes";

interface LoginButtonMessages {
  loading: string;
  setupIntegrations: string;
  dashboard: string;
  billing: string;
  settings: string;
  admin: string;
  logout: string;
  signIn: string;
}

interface ServiceSearchMessages {
  title: string;
  placeholder: string;
  notFound: string;
  categories: Record<string, string>;
  services: Record<string, string>;
}

interface ServiceDef {
  key: string;
  path: string;
  categoryKey: string;
}

const SERVICE_DEFS: ServiceDef[] = [
  { key: "Instances", path: ROUTES.instances, categoryKey: "Compute" },
  { key: "Network",   path: ROUTES.network,   categoryKey: "Network" },
  { key: "Firewall",  path: ROUTES.firewall,  categoryKey: "Network" },
  { key: "Volumes",   path: ROUTES.volumes,   categoryKey: "Storage" },
  { key: "Backups",   path: ROUTES.backups,   categoryKey: "Storage" },
  { key: "IAM",       path: ROUTES.iam,       categoryKey: "IAM" },
  { key: "Monitoring",path: ROUTES.monitoring,categoryKey: "Monitoring" },
  { key: "Billing",   path: ROUTES.billing,   categoryKey: "Billing" },
];

function ServicesMegaMenu({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const t = useMsg("ServiceSearch") as unknown as ServiceSearchMessages | undefined;

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const allServices = SERVICE_DEFS.map((def) => ({
    key: def.key,
    label: t?.services[def.key] ?? def.key,
    path: def.path,
    category: t?.categories[def.categoryKey] ?? def.categoryKey,
  }));

  const filtered = query.trim()
    ? allServices.filter(
        (s) =>
          s.label.toLowerCase().includes(query.toLowerCase()) ||
          s.category.toLowerCase().includes(query.toLowerCase())
      )
    : allServices;

  const byCategory = filtered.reduce<Record<string, typeof allServices>>((acc, s) => {
    if (!acc[s.category]) acc[s.category] = [];
    acc[s.category].push(s);
    return acc;
  }, {});

  return (
    <div
      className="fixed z-50"
      style={{
        top: "calc(var(--topbar-h) + 6px)",
        left: "8px",
        width: "640px",
        maxHeight: "calc(100vh - var(--topbar-h) - 20px)",
        background: "var(--bg-surface)",
        border: "1px solid var(--border-1)",
        borderRadius: "var(--r-lg)",
        boxShadow: "var(--shadow-pop)",
        overflow: "hidden",
        display: "grid",
        gridTemplateRows: "auto 1fr",
      }}
    >
      {/* Search */}
      <div
        style={{
          padding: "12px",
          borderBottom: "1px solid var(--border-1)",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <Search size={14} style={{ color: "var(--fg-muted)", flexShrink: 0 }} />
        <input
          ref={inputRef}
          type="text"
          placeholder={t?.placeholder ?? "Search services..."}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            flex: 1,
            border: "1px solid var(--border-2)",
            borderRadius: "var(--r-sm)",
            height: "32px",
            padding: "0 10px",
            fontSize: "13px",
            outline: "none",
            background: "var(--bg-surface)",
            color: "var(--fg-primary)",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "var(--border-focus)";
            e.currentTarget.style.boxShadow = "0 0 0 3px var(--brand-50)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "var(--border-2)";
            e.currentTarget.style.boxShadow = "none";
          }}
        />
      </div>

      {/* Service grid */}
      <div style={{ padding: "14px", overflowY: "auto" }}>
        {Object.keys(byCategory).length === 0 ? (
          <p style={{ fontSize: "12.5px", color: "var(--fg-muted)", textAlign: "center", padding: "24px 0" }}>
            {t?.notFound ?? "No services found"}
          </p>
        ) : (
          Object.entries(byCategory).map(([category, services]) => (
            <div key={category} style={{ marginBottom: "16px" }}>
              <h4
                style={{
                  margin: "0 0 8px",
                  fontSize: "11px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--fg-muted)",
                }}
              >
                {category}
              </h4>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "2px" }}>
                {services.map((s) => (
                  <Link
                    key={s.path}
                    href={s.path}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "8px 10px",
                      borderRadius: "var(--r-sm)",
                      border: "1px solid transparent",
                      textDecoration: "none",
                    }}
                    className="mm-service-item"
                    onClick={onClose}
                  >
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--fg-primary)" }}>
                      {s.label}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function UserMenu() {
  const { data: session } = useSession();
  const { user, isAuthenticated, isLoading, isAdmin } = useAuthStore();
  const idToken = session?.user?.idToken;
  const [iamProvider, setIamProvider] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const t = useMsg("LoginButton") as unknown as LoginButtonMessages | undefined;

  useEffect(() => {
    fetch("/api/setup-status")
      .then((r) => r.json())
      .then((d) => setIamProvider(d.iamProvider ?? "none"))
      .catch(() => setIamProvider("unknown"));
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!t) return null;

  if (iamProvider === "none") {
    return (
      <Link
        href="/admin/integrations"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          height: "32px",
          padding: "0 10px",
          borderRadius: "var(--r-sm)",
          color: "var(--fg-secondary)",
          fontSize: "12.5px",
          fontWeight: 500,
          textDecoration: "none",
        }}
        className="topbar-btn-link"
      >
        <ShieldCheck size={14} />
        {t.setupIntegrations}
      </Link>
    );
  }

  if (isLoading || iamProvider === null) {
    return (
      <div
        style={{
          height: "26px",
          width: "80px",
          borderRadius: "var(--r-sm)",
          background: "var(--bg-hover)",
        }}
      />
    );
  }

  if (isAuthenticated && user) {
    const initials = (user.name || user.email || "?").charAt(0).toUpperCase();
    const displayName = user.name || user.email || "User";
    const displaySub = user.email && user.name ? user.email : "";

    return (
      <div style={{ position: "relative" }} ref={menuRef}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "2px 10px 2px 4px",
            height: "34px",
            borderRadius: "var(--r-sm)",
            cursor: "pointer",
            background: menuOpen ? "var(--bg-hover)" : "transparent",
          }}
          className="user-chip"
        >
          <div
            style={{
              width: "26px",
              height: "26px",
              borderRadius: "50%",
              background: "var(--brand-600)",
              color: "#fff",
              fontWeight: 600,
              fontSize: "11px",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
          <div style={{ lineHeight: "1.1" }}>
            <div style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--fg-primary)", maxWidth: "112px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {displayName}
            </div>
            {displaySub && (
              <div style={{ fontSize: "11px", color: "var(--fg-muted)", fontFamily: "var(--font-mono)", maxWidth: "112px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {displaySub}
              </div>
            )}
          </div>
          <ChevronDown
            size={14}
            style={{
              color: "var(--fg-muted)",
              marginLeft: "2px",
              transform: menuOpen ? "rotate(180deg)" : "none",
              transition: "transform 120ms ease",
            }}
          />
        </button>

        {menuOpen && (
          <div
            style={{
              position: "absolute",
              right: 0,
              marginTop: "4px",
              width: "176px",
              background: "var(--bg-surface)",
              border: "1px solid var(--border-1)",
              borderRadius: "var(--r-md)",
              boxShadow: "var(--shadow-pop)",
              padding: "4px",
              zIndex: 100,
            }}
          >
            <DropdownItem icon={<LayoutDashboard size={14} />} href="/dashboard" label={t.dashboard} onClick={() => setMenuOpen(false)} />
            <DropdownItem icon={<CreditCard size={14} />} href="/billing" label={t.billing} onClick={() => setMenuOpen(false)} />
            <DropdownItem icon={<Settings size={14} />} href="/settings" label={t.settings} onClick={() => setMenuOpen(false)} />
            {isAdmin() && (
              <>
                <div style={{ height: "1px", background: "var(--border-1)", margin: "4px 0" }} />
                <DropdownItem icon={<ShieldCheck size={14} />} href="/admin" label={t.admin} onClick={() => setMenuOpen(false)} />
              </>
            )}
            <div style={{ height: "1px", background: "var(--border-1)", margin: "4px 0" }} />
            <button
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "6px 8px",
                borderRadius: "var(--r-sm)",
                fontSize: "12.5px",
                color: "var(--danger-600)",
                cursor: "pointer",
                background: "transparent",
                border: "none",
              }}
              className="dropdown-item-danger"
              onClick={() => {
                setMenuOpen(false);
                signOut({ callbackUrl: `/?logout=true${idToken ? `&id_token_hint=${idToken}` : ""}` });
              }}
            >
              <LogOut size={14} />
              {t.logout}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => signIn("zitadel")}
      style={{
        height: "32px",
        padding: "0 12px",
        background: "var(--brand-600)",
        color: "#fff",
        borderRadius: "var(--r-sm)",
        fontSize: "12.5px",
        fontWeight: 500,
        border: "none",
        cursor: "pointer",
      }}
    >
      {t.signIn}
    </button>
  );
}

function DropdownItem({
  icon,
  href,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  href: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "6px 8px",
        borderRadius: "var(--r-sm)",
        fontSize: "12.5px",
        color: "var(--fg-secondary)",
        textDecoration: "none",
      }}
      className="dropdown-item"
      onClick={onClick}
    >
      <span style={{ color: "var(--fg-muted)" }}>{icon}</span>
      {label}
    </Link>
  );
}

export function TopBar() {
  const [servicesOpen, setServicesOpen] = useState(false);
  const megaMenuRef = useRef<HTMLDivElement>(null);
  const servicesBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        megaMenuRef.current && !megaMenuRef.current.contains(e.target as Node) &&
        servicesBtnRef.current && !servicesBtnRef.current.contains(e.target as Node)
      ) {
        setServicesOpen(false);
      }
    }
    if (servicesOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [servicesOpen]);

  return (
    <>
      <header
        style={{
          display: "flex",
          alignItems: "stretch",
          height: "var(--topbar-h)",
          background: "var(--bg-surface)",
          borderBottom: "1px solid var(--border-1)",
          padding: "0 8px 0 16px",
          gap: "4px",
        }}
      >
        {/* Brand */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            paddingRight: "14px",
            marginRight: "4px",
            borderRight: "1px solid var(--border-1)",
            height: "100%",
          }}
        >
          <div
            style={{
              width: "22px",
              height: "22px",
              borderRadius: "5px",
              background: "var(--fg-primary)",
              display: "grid",
              placeItems: "center",
              color: "#fff",
              fontWeight: 700,
              fontSize: "11px",
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.5px",
              flexShrink: 0,
            }}
          >
            CS
          </div>
          <span
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--fg-primary)",
              letterSpacing: "-0.1px",
            }}
          >
            OpenCSP
          </span>
          <span
            style={{
              fontSize: "11px",
              color: "var(--fg-muted)",
              padding: "1px 6px",
              border: "1px solid var(--border-2)",
              borderRadius: "3px",
              fontFamily: "var(--font-mono)",
            }}
          >
            PROD
          </span>
        </div>

        {/* Services button */}
        <div style={{ display: "flex", alignItems: "center", gap: "2px", padding: "0 4px" }}>
          <button
            ref={servicesBtnRef}
            onClick={() => setServicesOpen((v) => !v)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              height: "32px",
              padding: "0 10px",
              borderRadius: "var(--r-sm)",
              color: servicesOpen ? "var(--brand-600)" : "var(--fg-secondary)",
              fontSize: "12.5px",
              fontWeight: 500,
              cursor: "pointer",
              background: servicesOpen ? "var(--bg-active)" : "transparent",
              border: "none",
              transition: "background 80ms ease",
            }}
            className="topbar-btn"
          >
            <Grid3x3 size={14} />
            Services
            <ChevronDown
              size={12}
              style={{
                color: "var(--fg-muted)",
                marginLeft: "2px",
                transform: servicesOpen ? "rotate(180deg)" : "none",
                transition: "transform 120ms ease",
              }}
            />
          </button>
        </div>

        {/* Search — grows */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", padding: "0 4px" }}>
          <div
            style={{
              flex: 1,
              maxWidth: "520px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              height: "32px",
              padding: "0 10px",
              background: "var(--bg-subtle)",
              border: "1px solid var(--border-1)",
              borderRadius: "var(--r-sm)",
              color: "var(--fg-muted)",
              fontSize: "12.5px",
              cursor: "text",
            }}
          >
            <Search size={13} style={{ flexShrink: 0 }} />
            <span style={{ flex: 1 }}>Search resources…</span>
            <kbd
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "10.5px",
                padding: "1px 5px",
                border: "1px solid var(--border-2)",
                borderRadius: "3px",
                color: "var(--fg-muted)",
                background: "var(--bg-surface)",
              }}
            >
              /
            </kbd>
          </div>
        </div>

        {/* Right: bell + user */}
        <div style={{ display: "flex", alignItems: "center", gap: "2px", padding: "0 4px" }}>
          <button
            style={{
              width: "32px",
              height: "32px",
              display: "grid",
              placeItems: "center",
              borderRadius: "var(--r-sm)",
              color: "var(--fg-secondary)",
              cursor: "pointer",
              background: "transparent",
              border: "none",
              position: "relative",
            }}
            className="topbar-icon-btn"
          >
            <Bell size={16} />
          </button>

          <div
            style={{
              width: "1px",
              background: "var(--border-1)",
              margin: "8px 4px",
              alignSelf: "stretch",
            }}
          />

          <UserMenu />
        </div>
      </header>

      {/* Mega menu backdrop + panel */}
      {servicesOpen && (
        <>
          <div
            style={{
              position: "fixed",
              inset: "var(--topbar-h) 0 0 0",
              background: "rgba(15,20,25,0.15)",
              zIndex: 40,
            }}
            onClick={() => setServicesOpen(false)}
          />
          <div ref={megaMenuRef}>
            <ServicesMegaMenu onClose={() => setServicesOpen(false)} />
          </div>
        </>
      )}

      <style>{`
        .topbar-btn:hover { background: var(--bg-hover) !important; color: var(--fg-primary) !important; }
        .topbar-icon-btn:hover { background: var(--bg-hover) !important; color: var(--fg-primary) !important; }
        .user-chip:hover { background: var(--bg-hover) !important; }
        .topbar-btn-link:hover { background: var(--bg-hover) !important; color: var(--fg-primary) !important; }
        .dropdown-item:hover { background: var(--bg-hover) !important; color: var(--fg-primary) !important; }
        .dropdown-item-danger:hover { background: var(--danger-50) !important; }
        .mm-service-item:hover { background: var(--bg-hover) !important; border-color: var(--border-1) !important; }
      `}</style>
    </>
  );
}
