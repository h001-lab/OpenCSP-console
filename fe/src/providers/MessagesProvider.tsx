"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import NextLink, { LinkProps as NextLinkProps } from "next/link";
import { usePathname } from "next/navigation";

// -----------------------
// Types
// -----------------------

/**
 * Messages는 어떤 JSON 구조도 허용한다.
 * 빌드 에러를 피하기 위해 Record<string, unknown>으로 유지하되,
 * 실제 런타임 JSON은 object literal로 들어와 자동완성이 가능해진다.
 */
export type Messages = Record<string, unknown>;

interface MessageContextValue {
  locale: string;
  messages: Messages;
}

interface MessagesProviderProps {
  locale: string;
  children: React.ReactNode;
  messages?: Messages;
  fetchUrl?: (locale: string) => string;
}

// -----------------------
// Context
// -----------------------
const MessageContext = createContext<MessageContextValue | null>(null);

// -----------------------
// Provider
// -----------------------
export function MessagesProvider({ locale, children, messages: initialMessages, fetchUrl }: MessagesProviderProps) {
  const [messages, setMessages] = useState<Messages | null>(initialMessages || null);

  useEffect(() => {
    if (!fetchUrl) return;
    const url = fetchUrl(locale);

    fetch(url)
      .then((res) => res.json())
      .then((json) => setMessages(json))
      .catch((err) => {
        console.error("Failed to load messages:", err);
        setMessages({});
      });
  }, [locale, fetchUrl]);

  if (!messages) return null;

  return (
    <MessageContext.Provider value={{ locale, messages }}>
      {children}
    </MessageContext.Provider>
  );
}

// -----------------------
// Hooks
// -----------------------

export function useLocale() {
  const ctx = useContext(MessageContext);
  if (!ctx) throw new Error("useLocale must be used inside MessagesProvider");
  return ctx.locale;
}

/**
 * useMsg
 * - key로 조회한 JSON 구조가 object literal이면 자동완성됨
 * - 타입을 강제하지 않고 전적으로 JSON 구조에 따라 달라짐
 * - TS 에러 없음
 */
export function useMsg<K extends string>(key: K) {
  const ctx = useContext(MessageContext);
  if (!ctx) throw new Error("useMsg must be used inside MessagesProvider");

  const data = ctx.messages[key];

  // undefined 가능성 → 페이지에서 안전하게 처리 가능
  if (typeof data !== "object" || data === null) return undefined;

  // 여기서 중요한 포인트:
  // TS는 data의 실제 값을 기반으로 자동 추론한다.
  return data as Record<string, unknown>;
}

/**
 * useAutoMsg
 * URL에서 자동으로 섹션 이름을 추출하여 useMsg 실행
 * /admin → "Admin"
 * /dashboard → "Dashboard"
 */
export function useAutoMsg() {
  const pathname = usePathname();

  const parts = pathname.split("/").filter(Boolean);
  const section = parts[1] ?? parts[0] ?? "";
  const key = section.charAt(0).toUpperCase() + section.slice(1);

  return useMsg(key);
}

// -----------------------
// Localized Link
// -----------------------
export interface LocalizedLinkProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement>,
  NextLinkProps {
  href: string;
}

export function Link({ href, children, ...props }: LocalizedLinkProps) {
  const locale = useLocale();

  const localized =
    typeof href === "string" && href.startsWith("/")
      ? `/${locale}${href}`
      : href;

  return (
    <NextLink href={localized} {...props}>
      {children}
    </NextLink>
  );
}