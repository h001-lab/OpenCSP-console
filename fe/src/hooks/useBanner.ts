"use client";

import { useEffect, useState } from "react";

export interface BannerState {
  message: string;
  link: string;
}

const POLL_INTERVAL_MS = 60_000;

export function useBanner(): BannerState {
  const [banner, setBanner] = useState<BannerState>({ message: "", link: "" });

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/public/banner", { cache: "no-store" });
        if (res.ok) setBanner(await res.json());
      } catch {}
    };
    load();
    const id = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return banner;
}
