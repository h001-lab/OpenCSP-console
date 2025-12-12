"use client";

import { Sidebar, NavBar, Avatar, type SideBarItem } from "@h001/ui";
import { Link, useMsg } from "@/providers/MessagesProvider";
import { PropsWithChildren } from "react";


export interface LayoutProps extends PropsWithChildren {
  navDomain: string;
  sidebarDomain: string;
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

export default function Layout({ children, navDomain, sidebarDomain }: LayoutProps) {
  const nav = useMsg(navDomain) as unknown as NavMessage;
  const t = useMsg(sidebarDomain) as unknown as SidebarMessage;

  if (!nav || !t) return null;

  return (
    <>
      <NavBar
        left={<h2 className="font-medium text-lg">{nav.title}</h2>}
        center={
          <>
            <Link href="/">{nav.home}</Link>
            <Link href="/dashboard">{nav.dashboard}</Link>
            <Link href="/components">{nav.components}</Link>
            <Link href="/announcements">{nav.announcements}</Link>
            <Link href="/admin">{nav.admin}</Link>
          </>
        }
        right={<Avatar name="관리자" size="sm" />}
      />
      <div className="flex min-h-[calc(100vh-3rem)]">
        <Sidebar items={t.sidebar as SideBarItem[]} linkComponent={Link} />
        <main className="flex-1 p-3">{children}</main>
      </div>
    </>
  );
}