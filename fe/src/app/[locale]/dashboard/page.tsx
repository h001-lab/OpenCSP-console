"use client";

import Layout from "@/components/Layout/Layout";
import { useMsg } from "@/providers/MessagesProvider";

interface DashboardPageMessage {
	title: string;
}

export default function Page() {
	const t = useMsg("Dashboard") as unknown as DashboardPageMessage;
	if (!t) return null;
	return (
		<Layout navDomain="Nav" sidebarDomain="Dashboard">
			<main className="p-6 gap-6">
				<div className="mb-6">
					<h1 className="text-2xl font-bold mb-4">{t?.title}</h1>
					<p>대시보드 메인 페이지 콘텐츠를 여기에 추가하세요.</p>
				</div>
			</main>
		</Layout>
	);
}
