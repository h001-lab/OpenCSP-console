"use client";

import { Panel, DenseTable } from "@h001/ui";
import { Announcement } from "./types";
import { columns, data, announcements } from "./mocks";
import { useAutoMsg } from "@/providers/MessagesProvider";
import Layout from "@/components/Layout/Layout";

export default function Page() {
	const t = useAutoMsg();

	return (
		<Layout navDomain="Nav" sidebarDomain="Announcements">
			<main className="p-6 gap-6">
				<div className="mb-6">
					<Panel title={t?.title + " (Style1)"}>
						<DenseTable<Announcement> columns={columns} data={data} />
					</Panel>
				</div>
				<div className="mb-6">
					<Panel title={t?.title + " (Style2)"}>
						<DenseTable<Announcement> columns={columns} data={announcements} />
					</Panel>
				</div>
			</main>
		</Layout>
	);
}
