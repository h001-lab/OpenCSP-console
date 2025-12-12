"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const SUPPORTED = ["ko", "en"];
const DEFAULT = "en";

export default function RootRedirect() {
  const router = useRouter();

  useEffect(() => {
    const browserLang = navigator.language.split("-")[0]; // "en-US" → "en"
    const locale = SUPPORTED.includes(browserLang) ? browserLang : DEFAULT;

    router.replace(`/${locale}`);
  }, [router]);

  return null;
}