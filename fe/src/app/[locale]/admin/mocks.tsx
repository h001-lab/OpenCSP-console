import { Column } from "@/components/types";
import { Avatar, Toggle } from "@h001/ui";
import { Link } from "@/providers/MessagesProvider";
import { AnnouncementAdmin } from "./types";

export const columns: Column<AnnouncementAdmin>[] = [
	{ key: "num", label: "번호", width: "10%" },
	{ key: "name", label: "제목", width: "40%" },
	{ key: "author", label: "작성자", width: "10%" },
	{ key: "created", label: "Created", width: "10%" },
	{ key: "banner", label: "배너 링크 지정", width: "10%" },
];

export const data: AnnouncementAdmin[] = [
	{
		num: 1,
		name: <Link href={"/announcements/1"}>신규 기능 개발관련 공지</Link>,
		author: "Manager",
		created: "2023-10-10",
		banner: <Toggle value={true} />,
	},
	{
		num: 2,
		name: <Link href={"/announcements/2"}>VM 스펙관련 내용 정리</Link>,
		author: "Manager",
		created: "2023-10-10",
		banner: false,
	},
	{
		num: 3,
		name: <Link href={"/announcements/3"}>서비스 점검 안내</Link>,
		author: "Admin",
		created: "2023-10-12",
		banner: false,
	},
	{
		num: 4,
		name: <Link href={"/announcements/4"}>긴급 보안 업데이트 공지</Link>,
		author: "Security",
		created: "2023-10-15",
		banner: false,
	},
	{
		num: 5,
		name: "이용약관 변경 안내",
		author: "Legal",
		created: "2023-10-20",
		banner: false,
	},
];

export const announcements: AnnouncementAdmin[] = [
	{
		num: 1,
		name: <Link href={"/announcements/1"}>신규 기능 개발관련 공지</Link>,
		author: <Avatar name="관리자" size="sm" />,
		created: <div className="flex items-center gap-1">2024-01-30</div>,
		banner: <Toggle value={true} />,
	},
	{
		num: 2,
		name: <Link href={"/announcements/2"}>VM 스펙관련 내용 정리</Link>,
		author: <Avatar name="관리자" size="sm" />,
		created: <div className="flex items-center gap-1">2024-01-30</div>,
		banner: <Toggle value={false} />,
	},
	{
		num: 3,
		name: <Link href={"/announcements/3"}>서비스 점검 안내</Link>,
		author: <Avatar name="관리자" size="sm" />,
		created: <div className="flex items-center gap-1">2024-01-30</div>,
		banner: <Toggle value={false} />,
	},
	{
		num: 4,
		name: <Link href={"/announcements/4"}>긴급 보안 업데이트 공지</Link>,
		author: <Avatar name="보안" size="sm" />,
		created: <div className="flex items-center gap-1">2023-10-15</div>,
		banner: <Toggle value={false} />,
	},
];
