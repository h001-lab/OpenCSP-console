"use client";

import Layout from "@/components/Layout/Layout";
import { useAutoMsg } from "@/providers/MessagesProvider";
import { MonitoringPageMessage } from "../types";
import { useAdminProtection } from "@/hooks/useAdminProtection";

export default function Page() {
	const isAdmin = useAdminProtection();
	const t = useAutoMsg() as unknown as MonitoringPageMessage;
	if (!isAdmin || !t) return null;

	return (
		<Layout navDomain="Nav" sidebarDomain="Admin">
			<main className="p-3 gap-3">
				<div className="mb-6">
					<h2 className="text-lg font-semibold text-gray-700 mb-2">
						{t?.monitoring.title || "Monitoring"}
					</h2>
					<hr />
				</div>
				<div className="mt-3">
					<h2 className="text-lg font-semibold text-gray-700 mb-2">
						{t?.monitoring.sub_title_1 || "Logs & Reports"}
					</h2>
				</div>
			</main>
		</Layout>
	);
}
