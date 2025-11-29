"use client";

import styles from "./Toggle.module.css";

interface ToggleProps {
  value: boolean;
  onChange: (value: boolean) => void;
}

export function Toggle({ value, onChange }: ToggleProps) {
  return (
    <div
      className={`${styles.toggle} ${value ? styles.toggleOn : ""}`}
      onClick={() => onChange(!value)}
    >
      <div className={`${styles.knob} ${value ? styles.knobOn : ""}`} />
    </div>
  );
}