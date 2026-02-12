"use client";

import { NotificationBanner, Sidebar, NavBar, SideBarItem } from "@h001/ui";
import { Link, useMsg } from "@/providers/MessagesProvider";
import { PropsWithChildren, useState } from "react";
import { LoginButton } from "@/components/auth/LoginButton";
import { useAuthStore } from "@/stores/authStore";


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
  home: string;
  dashboard: string;
  components: string;
  announcements: string;
  admin: string;
}

interface SidebarMessage {
  sidebar: SideBarItem[];
}

export default function Layout({
  children,
  navDomain,
  sidebarDomain,
}: LayoutProps) {
  const { isAdmin } = useAuthStore();

  const nav = useMsg(navDomain) as unknown as NavMessage;
  const components = useMsg("Components") as unknown as ComponentsMessage;
  const t = useMsg(sidebarDomain) as unknown as SidebarMessage;
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (!nav || !t || !components) return null;

  return (
    <>
      <NotificationBanner
        linkLabel={components.Banner.linkLabel}
        linkHref="/announcements/1"
        storageKey={components.Banner.storageKey}
      >
        공지사항 테스트
      </NotificationBanner>
      <NavBar
        left={<div className="flex items-center gap-3">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="md:hidden p-1 -ml-1 rounded hover:bg-gray-100"
            aria-label="메뉴 열기">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h2 className="font-medium text-lg">{nav.title as string}</h2>
        </div>}
        center={
          <>
            <Link href="/">{nav.home as string}</Link>
            <Link href="/dashboard">{nav.dashboard as string}</Link>
            <Link href="/announcements">{nav.announcements as string}</Link>
            {isAdmin() && <Link href="/admin">{nav.admin as string}</Link>}
          </>
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