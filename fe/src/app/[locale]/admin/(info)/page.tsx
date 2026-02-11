"use client";

import Layout from "@/components/Layout/Layout";
import { useAutoMsg } from "@/providers/MessagesProvider";
import { InfoPageMessage } from "../types";
import { useAdminProtection } from "@/hooks/useAdminProtection";

export default function Page() {
	const isAdmin = useAdminProtection();
	const t = useAutoMsg() as unknown as InfoPageMessage;

	if (!isAdmin || !t) return null;

	return (
		<Layout navDomain="Nav" sidebarDomain="Admin">
			<main className="p-3 gap-3">
				<div className="mb-6">
					<h2 className="text-lg font-semibold text-gray-700 mb-2">
						{t.title || "Information"}
					</h2>
					<hr />
				</div>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					<div className="p-4 border rounded-lg shadow-sm">
						<h2 className="text-lg font-medium mb-2">{t.info[0].label}</h2>
						<p>{t.info[0].description || ""}</p>
					</div>
					<div className="p-4 border rounded-lg shadow-sm">
						<h2 className="text-lg font-medium mb-2">{t.info[1].label}</h2>
						<p>{t.info[1].description || ""}</p>
					</div>
					<div className="p-4 border rounded-lg shadow-sm">
						<h2 className="text-lg font-medium mb-2">{t.info[2].label}</h2>
						<p>{t.info[2].description || ""}</p>
					</div>
				</div>
			</main>
		</Layout>
	);
}
