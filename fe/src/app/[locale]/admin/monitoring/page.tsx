"use client";

import Layout from "@/components/Layout/Layout";
import { useAutoMsg } from "@/providers/MessagesProvider";

interface MonitoringPageMessage {
	monitoring: {
		title: string;
	};
}

export default function Page() {
	const t = useAutoMsg() as unknown as MonitoringPageMessage;
	if (!t) return null;

	return (
		<Layout navDomain="Nav" sidebarDomain="Admin">
			<main className="p-3 gap-3">
				<div className="mb-6">
					<h2 className="text-lg font-semibold text-gray-700 mb-2">
						{t?.monitoring.title}
					</h2>
					<hr />
				</div>
				<div className="mt-3">
					<h2 className="text-lg font-semibold text-gray-700 mb-2">
						Logs & Reports
					</h2>
				</div>
			</main>
		</Layout>
	);
}
