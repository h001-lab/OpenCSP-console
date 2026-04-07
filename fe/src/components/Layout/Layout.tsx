"use client";

import { NotificationBanner, Sidebar, SideBarItem } from "@h001/ui";
import { Header } from "@/components/Layout/Header";
import { Link, useMsg } from "@/providers/MessagesProvider";
import Image from "next/image";
import { PropsWithChildren, useState } from "react";
import { LoginButton } from "@/components/auth/LoginButton";
import { ServiceSearch } from "@/components/Layout/ServiceSearch";
import { useBanner } from "@/hooks/useBanner";

export interface LayoutProps extends PropsWithChildren {
  navDomain: string;
  sidebarDomain: string;
}

interface ComponentsMessage {
  Banner: {
    linkLabel: string;
    storageKey: string;
  };
}

interface NavMessage {
  title: string;
}

interface SidebarMessage {
  sidebar: SideBarItem[];
}

export default function Layout({
  children,
  navDomain,
  sidebarDomain,
}: LayoutProps) {
  const nav = useMsg(navDomain) as unknown as NavMessage;
  const components = useMsg("Components") as unknown as ComponentsMessage;
  const t = useMsg(sidebarDomain) as unknown as SidebarMessage;
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const banner = useBanner();

  if (!nav || !t || !components) return null;

  return (
    <>
      {banner.message && (
        <NotificationBanner
          linkLabel={components.Banner.linkLabel}
          linkHref={banner.link || undefined}
          storageKey={`banner-${banner.message.slice(0, 50)}`}
        >
          {banner.message}
        </NotificationBanner>
      )}
      <Header
        left={
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-1 -ml-1 rounded hover:bg-gray-100"
              aria-label="메뉴 열기"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <Link href="/" className="flex items-center gap-1.5 font-medium text-lg hover:opacity-75 transition-opacity">
              {/* <Image src="/favicon.svg" alt="OpenCSP" width={22} height={22} /> */}
              {nav.title as string}
            </Link>
            <ServiceSearch />
          </div>
        }
        right={<LoginButton />}
      />
      <div className="flex min-h-[calc(100vh-3rem)]">
        <Sidebar
          items={t.sidebar as SideBarItem[]}
          linkComponent={Link}
          mobileOpen={isSidebarOpen}
          onMobileClose={() => setIsSidebarOpen(false)}
        />
        <main className="flex-1 p-3">{children}</main>
      </div>
    </>
  );
}
