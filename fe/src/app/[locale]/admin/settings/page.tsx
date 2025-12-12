"use client";

import { Panel, DenseTable, Button, Tabs, TabPanel, Tab, Banner, TabList } from "@h001/ui";
import { AnnouncementAdmin } from "../types";
import { columns, announcements } from "../mocks";
import { useState } from "react";
import { AnnouncementSelector } from "./_components/AnnouncementSelector";
import Layout from "@/components/Layout/Layout";

export default function Page() {
	const [selectedLink, setSelectedLink] = useState("");
	const [message, setMessage] = useState(
		"신규 공지사항이 없습니다.\n자세한 내용은 공지사항 페이지를 확인해주세요."
	);

	return (
		<Layout navDomain="Nav" sidebarDomain="Admin">
			<main className="p-3 gap-3">
				<div className="mb-6">
					<h2 className="text-lg font-semibold text-gray-700 mb-2">
						시스템 설정 (System Settings)
					</h2>
					<hr />
				</div>

				<div className="mt-3">
					<h2 className="text-lg font-semibold text-gray-700 mb-2">
						공지사항 & 배너 설정
					</h2>
				</div>
				<div className="mt-3 p-4 border rounded-lg shadow-sm">
					<Tabs defaultTab="option1">
						<TabList>
							<Tab id="option1">공지사항 설정</Tab>
							<Tab id="option2">배너 설정</Tab>
						</TabList>

						<TabPanel id="option1">
							<Panel title="공지사항 설정">
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
							<Panel title="배너 문구" className="flex flex-col mb-2">
								<p>배너 미리보기</p>
								<div className="flex flex-col border rounded-lg shadow-sm mb-2 p-2 gap-3">
									<Banner preview={true} text={message} link={selectedLink} />
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
