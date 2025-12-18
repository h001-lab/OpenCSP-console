"use client";

import { Panel, DenseTable } from "@h001/ui";
import { Announcement } from "./types";
import { columns, data } from "./mocks";
import { useAutoMsg } from "@/providers/MessagesProvider";
import Layout from "@/components/Layout/Layout";

export default function Page() {
	const t = useAutoMsg();
	if (!t) return null;

	return (
		<Layout navDomain="Nav" sidebarDomain="Announcements">
			<main className="p-6 gap-6">
				<div className="mb-6">
					<Panel title={t?.title + ""}>
						<DenseTable<Announcement> columns={columns} data={data} />
					</Panel>
				</div>
			</main>
		</Layout>
	);
}
