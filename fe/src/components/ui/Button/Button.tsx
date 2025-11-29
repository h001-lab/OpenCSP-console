"use client";

import styles from "./Button.module.css";

interface ButtonProps {
  children: React.ReactNode;
  variant?: "neutral" | "primary" | "danger" | "ghost";
  onClick?: () => void;
  className?: string;
}

export function Button({
  children,
  variant = "neutral",
  onClick,
  className = "",
}: ButtonProps) {
  return (
    <button
      className={`${styles.btn} ${styles[variant]} ${className}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}