"use client";
import styles from "./ListPanel.module.css";

export function ListPanel({
  title,
  children,
  right,
}: {
  title: string;
  children?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.row}>
        <div className={styles.title}>{title}</div>
        {right && <div className={styles.action}>{right}</div>}
      </div>

      {children && <div className={styles.content}>{children}</div>}
    </div>
  );
}