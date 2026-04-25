"use client";

import { ReactNode } from "react";

interface AdminListPanelProps {
  title: string;
  actions?: ReactNode;
  searchValue?: string;
  onSearch?: (val: string) => void;
  searchPlaceholder?: string;
  filters?: ReactNode;
  loading?: boolean;
  loadingText?: string;
  children: ReactNode;
  className?: string;
}

export default function AdminListPanel({
  title,
  actions,
  searchValue,
  onSearch,
  searchPlaceholder = "Search...",
  filters,
  loading = false,
  loadingText = "Loading...",
  children,
}: AdminListPanelProps) {
  return (
    <div style={{
      background: "var(--bg-surface)",
      border: "1px solid var(--border-1)",
      borderRadius: "var(--r-md)",
      boxShadow: "var(--shadow-card)",
      overflow: "hidden",
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        flexWrap: "wrap",
        padding: "10px 16px",
        borderBottom: "1px solid var(--border-1)",
        minHeight: "44px",
      }}>
        <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--fg-primary)", whiteSpace: "nowrap", marginRight: 4 }}>{title}</span>
        {filters}
        {onSearch && (
          <input
            type="text"
            style={{
              border: "1px solid var(--border-2)",
              borderRadius: "var(--r-sm)",
              padding: "4px 8px",
              fontSize: "12px",
              width: "176px",
              color: "var(--fg-primary)",
              background: "var(--bg-surface)",
              outline: "none",
            }}
            placeholder={searchPlaceholder}
            value={searchValue ?? ""}
            onChange={(e) => onSearch(e.target.value)}
          />
        )}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "auto" }}>{actions}</div>
      </div>

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 16px", gap: 12 }}>
          <div style={{ width: 20, height: 20, border: "2px solid var(--brand-600)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
          <span style={{ fontSize: "13px", color: "var(--fg-muted)" }}>{loadingText}</span>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        children
      )}
    </div>
  );
}
