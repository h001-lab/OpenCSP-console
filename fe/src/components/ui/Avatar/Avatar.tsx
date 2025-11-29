"use client";

import Image from "next/image";
import styles from "./Avatar.module.css";

interface AvatarProps {
  name?: string;
  src?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Avatar({ name, src, size = "md", className }: AvatarProps) {
  const initial = name ? name.charAt(0).toUpperCase() : "?";
  const color = stringToColor(name || "unknown");

  return (
    <div
      className={`${styles.avatar} ${styles[size]} ${className || ""}`}
      style={{ backgroundColor: src ? "transparent" : color }}
    >
      {src ? (
        <Image src={src} alt={name || "Avatar"} className={styles.image} width={100} height={100} />
      ) : (
        <span className={styles.initial}>{initial}</span>
      )}
    </div>
  );
}

// 문자열을 기반으로 일정한 색상 생성
function stringToColor(str: string): string {
  let hash = 0;

  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  const hue = Math.abs(hash % 360);

  return `hsl(${hue}, 60%, 75%)`; // 파스텔톤
}