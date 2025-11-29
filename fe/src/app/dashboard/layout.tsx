import { Banner } from "@/components/ui/Banner/Banner";
import { NavBar } from "@/components/ui/NavBar/NavBar";
import { Sidebar } from "@/components/ui/Sidebar";
import { SideBarItem } from "@/components/types";
import Link from "next/link";

const items: SideBarItem[] = [
    { label: "Home", path: "/" },
	{ label: "Dashboard", path: "/dashboard" },
	{ label: "Components", path: "/components" },
    { label: "Announcements", path: "/announcements" },
];

export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<>
			<Banner />
			<NavBar
				left={<h2 className="font-medium text-lg ">OpenVPS</h2>}
				center={
					<>
						<Link href="/">홈</Link>
                        <Link href="/dashboard">대시보드</Link>
						<Link href="/components">컴포넌트</Link>
						<Link href="/announcements">공지사항</Link>
					</>
				}
			/>
			<div className="flex min-h-[calc(100vh-3rem)]">
				<Sidebar items={items} />
				<main className="flex-1 p-3">{children}</main>
			</div>
		</>
	);
}
