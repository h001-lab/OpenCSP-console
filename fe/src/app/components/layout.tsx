import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { SideBarItem } from "@/components/types";

const items: SideBarItem[] = [
	{ label: "Dashboard", path: "/" },
	{ label: "Components", path: "/components" },
];

export default function TestLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<>
			<Header />
			<div className="flex min-h-[calc(100vh-3rem)]">
				<Sidebar items={items} />
				<main className="flex-1 p-6">{children}</main>
			</div>
		</>
	);
}
