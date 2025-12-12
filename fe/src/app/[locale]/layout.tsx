import { MessagesProvider } from "@/providers/MessagesProvider";
import { use } from "react";

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default function LocaleLayout({ children, params }: LocaleLayoutProps) {
  // 런타임 unwrap (Next 16 RSC 규칙)
  const { locale } = use(params);

  const messages = use(
    fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/messages/${locale}.json`, {
      cache: "no-store",
    }).then((res) => res.json())
  );

  return (
    <MessagesProvider locale={locale} messages={messages}>
      {children}
    </MessagesProvider>
  );
}