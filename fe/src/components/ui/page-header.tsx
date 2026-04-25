import { CSSProperties, ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  style?: CSSProperties;
}

export function PageHeader({ title, subtitle, actions, style }: PageHeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        marginBottom: "16px",
        gap: "16px",
        ...style,
      }}
    >
      <div>
        <h1
          style={{
            margin: 0,
            fontSize: "20px",
            fontWeight: 600,
            letterSpacing: "-0.2px",
            color: "var(--fg-primary)",
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p style={{ marginTop: "4px", fontSize: "12.5px", color: "var(--fg-muted)" }}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {actions}
        </div>
      )}
    </div>
  );
}
