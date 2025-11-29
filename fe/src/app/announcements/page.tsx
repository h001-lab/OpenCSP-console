"use client";

import { Announcement, Column } from "@/components/types";
import { Avatar } from "@/components/ui/Avatar/Avatar";
import { Panel } from "@/components/ui/Panel/Panel";
import { DenseTable } from "@/components/ui/Table/DenseTable";
import Link from "next/link";

const columns: Column<Announcement>[] = [
	{ key: "num", label: "번호", width: "10%" },
	{ key: "name", label: "제목", width: "40%" },
	{ key: "author", label: "작성자", width: "10%" },
	{ key: "created", label: "Created", width: "10%" },
];

const data: Announcement[] = [
	{
		num: 1,
		name: <Link href={"/announcements/1"}>신규 기능 개발관련 공지</Link>,
		author: "Manager",
		created: "2023-10-10",
	},
	{
		num: 2,
		name: <Link href={"/announcements/2"}>VM 스펙관련 내용 정리</Link>,
		author: "Manager",
		created: "2023-10-10",
	},
	{
		num: 3,
		name: <Link href={"/announcements/3"}>서비스 점검 안내</Link>,
		author: "Admin",
		created: "2023-10-12",
	},
	{
		num: 4,
		name: <Link href={"/announcements/4"}>긴급 보안 업데이트 공지</Link>,
		author: "Security",
		created: "2023-10-15",
	},
	{
		num: 5,
		name: "이용약관 변경 안내",
		author: "Legal",
		created: "2023-10-20",
	},
];
const announcements: Announcement[] = [
	{
		num: 1,
		name: <Link href={"/announcements/1"}>공지 제목</Link>,
		author: <Avatar name="관리자" />,
		created: <div className="flex items-center gap-1">2024-01-30</div>,
	},
	{
		num: 2,
		name: <Link href={"/announcements/2"}>공지 제목</Link>,
		author: <Avatar name="관리자" />,
		created: <div className="flex items-center gap-1">2024-01-30</div>,
	},
];

export default function Page() {
	return (
		<main className="p-6 gap-6">
			<div className="mb-6">
				<Panel title="공지사항 (Style1)">
					<DenseTable<Announcement> columns={columns} data={data} />
				</Panel>
			</div>
			<div className="mb-6">
				<Panel title="공지사항 (Style2)">
					<DenseTable<Announcement> columns={columns} data={announcements} />
				</Panel>
			</div>
		</main>
	);
}
