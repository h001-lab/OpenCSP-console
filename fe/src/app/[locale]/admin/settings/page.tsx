"use client";

import { Panel, DenseTable, Button, Tabs, TabPanel, Tab, NotificationBanner, TabList } from "@h001/ui";
import { AnnouncementAdmin, ComponentsMessage, SettingsPageMessage } from "../types";
import { columns, announcements } from "../mocks";
import { useState } from "react";
import { AnnouncementSelector } from "./_components/AnnouncementSelector";
import Layout from "@/components/Layout/Layout";
import { useAutoMsg, useMsg } from "@/providers/MessagesProvider";

export default function Page() {
	const t = useAutoMsg() as unknown as SettingsPageMessage;
	const components = useMsg("Components") as unknown as ComponentsMessage;
	if (!t || !components) return null;
	const [selectedLink, setSelectedLink] = useState("");
	const [message, setMessage] = useState(
		"신규 공지사항이 없습니다.\n자세한 내용은 공지사항 페이지를 확인해주세요."
	);

	return (
		<Layout navDomain="Nav" sidebarDomain="Admin">
			<main className="p-3 gap-3">
				<div className="mb-6">
					<h2 className="text-lg font-semibold text-gray-700 mb-2">
						{t?.settings.title}
					</h2>
					<hr />
				</div>

				<div className="mt-3">
					<h2 className="text-lg font-semibold text-gray-700 mb-2">
						{t?.settings.sub_title_1}
					</h2>
				</div>
				<div className="mt-3 p-4 border rounded-lg shadow-sm">
					<Tabs defaultTab="option1">
						<TabList>
							<Tab id="option1">{t.settings.tabs.tab_1.title}</Tab>
							<Tab id="option2">{t.settings.tabs.tab_2.title}</Tab>
						</TabList>

						<TabPanel id="option1">
							<Panel title={t.settings.tabs.tab_1.title}>
								<div className="p-3 flex flex-col">
									<div className="mb-6">
										<Panel title="공지사항 (Style2)">
											<DenseTable<AnnouncementAdmin>
												columns={columns}
												data={announcements}
											/>
										</Panel>
									</div>
									<textarea
										className="border p-2 text-sm rounded-[3px]"
										rows={3}
										placeholder="공지 내용"
									/>
									<div className="gap-2 flex justify-end mt-3">
										<Button variant="neutral">공지 등록</Button>
									</div>
								</div>
							</Panel>
						</TabPanel>

						<TabPanel id="option2">
							<Panel title={t.settings.tabs.tab_2.title} className="flex flex-col mb-2">
								<p>배너 미리보기</p>
								<div className="flex flex-col border rounded-lg shadow-sm mb-2 p-2 gap-3">
									<NotificationBanner linkLabel={components.Banner.linkLabel} linkHref={selectedLink}>{message}</NotificationBanner>
									<textarea
										className="border p-2 rounded h-24 overflow-y-auto"
										value={message}
										onChange={(e) => setMessage(e.target.value)}
									/>
									<div className="flex gap-2 items-center">
										<p>공지 링크 선택: </p>
										<div className="flex gap-2 items-center">
											<AnnouncementSelector onSelect={setSelectedLink} />
										</div>

										<div className="flex gap-2 justify-end ml-auto">
											<Button variant="primary">배너 적용</Button>
										</div>
									</div>
								</div>
							</Panel>
						</TabPanel>
					</Tabs>
				</div>
			</main>
		</Layout>
	);
}
