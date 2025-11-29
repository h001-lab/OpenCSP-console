"use client";

import React from "react";
import styles from "./NavBar.module.css";

interface NavBarProps {
  left?: React.ReactNode;
  center?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}

export function NavBar({ left, center, right, className }: NavBarProps) {
  return (
    <div className={`${styles.navbar} ${className || ""}`}>
      {/* 왼쪽 영역 */}
      <div className={styles.left}>{left}</div>

      {/* 중앙 영역 */}
      <div className={styles.center}>{center}</div>

      {/* 오른쪽 영역 */}
      <div className={styles.right}>{right}</div>
    </div>
  );
}