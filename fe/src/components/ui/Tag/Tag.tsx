"use client";

import styles from "./Tag.module.css";

interface TagProps {
  children: React.ReactNode;
  type?: "success" | "warning" | "error" | "info";
}

export function Tag({ children, type = "info" }: TagProps) {
  return <span className={`${styles.tag} ${styles[type]}`}>{children}</span>;
}