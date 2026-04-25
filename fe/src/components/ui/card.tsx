import { CSSProperties, ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
}

interface CardHeadProps {
  title: string;
  count?: number | string;
  actions?: ReactNode;
  style?: CSSProperties;
}

export function Card({ children, style, className }: CardProps) {
  return (
    <div
      className={className}
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-1)",
        borderRadius: "var(--r-md)",
        boxShadow: "var(--shadow-card)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function CardHead({ title, count, actions, style }: CardHeadProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 16px",
        borderBottom: "1px solid var(--border-1)",
        minHeight: "44px",
        ...style,
      }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <h2 style={{ margin: 0, fontSize: "13.5px", fontWeight: 600, color: "var(--fg-primary)" }}>
          {title}
        </h2>
        {count !== undefined && (
          <span
            style={{
              color: "var(--fg-muted)",
              fontWeight: 400,
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
            }}
          >
            {count}
          </span>
        )}
      </span>
      {actions && (
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {actions}
        </div>
      )}
    </div>
  );
}

export function CardBody({ children, style }: CardProps) {
  return (
    <div style={{ padding: "16px", ...style }}>
      {children}
    </div>
  );
}
