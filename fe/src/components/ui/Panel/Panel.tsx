"use client";
import styles from "./Panel.module.css";

export function Panel({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className={`${styles.panel} flex flex-col gap-2`}>
      {title && <div className={styles.header}>{title}</div>}
      <div className="mt-1">{children}</div>
    </div>
  );
}