import { CSSProperties, ReactNode } from "react";

type BadgeVariant = "ok" | "warn" | "danger" | "info" | "neutral";

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
}

const VARIANT_STYLES: Record<BadgeVariant, CSSProperties> = {
  ok:      { background: "var(--ok-50)",      color: "var(--ok-600)",      border: "1px solid var(--ok-600)" },
  warn:    { background: "var(--warn-50)",    color: "var(--warn-600)",    border: "1px solid var(--warn-600)" },
  danger:  { background: "var(--danger-50)",  color: "var(--danger-600)",  border: "1px solid var(--danger-600)" },
  info:    { background: "var(--info-50)",    color: "var(--info-600)",    border: "1px solid var(--brand-100)" },
  neutral: { background: "var(--neutral-50)", color: "var(--neutral-600)", border: "1px solid var(--border-2)" },
};

export function Badge({ variant = "neutral", children, style, className }: BadgeProps) {
  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        height: "20px",
        padding: "0 7px",
        borderRadius: "10px",
        fontSize: "11.5px",
        fontWeight: 500,
        lineHeight: 1,
        whiteSpace: "nowrap",
        ...VARIANT_STYLES[variant],
        ...style,
      }}
    >
      {children}
    </span>
  );
}
