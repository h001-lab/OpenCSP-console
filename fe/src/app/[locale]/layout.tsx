import { MessagesProvider } from "@/providers/MessagesProvider";
import { use } from "react";

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "";

export default function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = use(params); // 런타임 unwrap (Next 16 RSC 규칙)

  const messages = use(
    fetch(`${SITE_URL}/messages/${locale}.json`, {
      cache: "no-store",
    }).then((res) => res.json())
  );

  return (
    <MessagesProvider locale={locale} messages={messages}>
      {children}
    </MessagesProvider>
  );
}