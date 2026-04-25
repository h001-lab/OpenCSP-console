"use client";

import Layout from "@/components/Layout/Layout";
import { useAutoMsg } from "@/providers/MessagesProvider";
import { InfoPageMessage } from "../types";
import { useAdminProtection } from "@/hooks/useAdminProtection";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHead, CardBody } from "@/components/ui/card";

export default function Page() {
	const isAdmin = useAdminProtection();
	const t = useAutoMsg() as unknown as InfoPageMessage;

	if (!isAdmin || !t) return null;

	return (
		<Layout navDomain="Nav" sidebarDomain="Admin">
			<PageHeader title={t.title || "Information"} />
			<div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
				{t.info.map((item) => (
					<Card key={item.label}>
						<CardHead title={item.label} />
						<CardBody>
							<p style={{ margin: 0, fontSize: "13px", color: "var(--fg-secondary)", lineHeight: 1.6 }}>
								{item.description || ""}
							</p>
						</CardBody>
					</Card>
				))}
			</div>
		</Layout>
	);
}
