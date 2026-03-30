import React from "react";

export interface HeaderProps {
  left?: React.ReactNode;
  center?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}

/**
 * Site-wide header component (semantic <header> replacement for NavBar).
 * Mirrors the NavBar interface from @h001/ui for future package inclusion.
 */
export function Header({ left, center, right, className }: HeaderProps) {
  return (
    <header
      className={`h-12 bg-white border-b border-gray-200 px-4 flex items-center justify-between gap-3 ${className ?? ""}`}
    >
      <div className="flex items-center gap-2">{left}</div>
      <div className="flex flex-1 items-center justify-center gap-2">{center}</div>
      <div className="flex items-center gap-2 ml-auto">{right}</div>
    </header>
  );
}
