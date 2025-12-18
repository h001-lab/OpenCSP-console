import { Column } from "@/components/types";
import { Avatar } from "@h001/ui";
import { Link } from "@/providers/MessagesProvider";
import { Announcement } from "./types";

export const columns: Column<Announcement>[] = [
	{ key: "num", label: "번호", width: "10%" },
	{ key: "name", label: "제목", width: "40%" },
	{ key: "author", label: "작성자", width: "10%" },
	{ key: "created", label: "Created", width: "10%" },
];

export const data: Announcement[] = [
	{
		num: 1,
		name: <Link href={"/announcements/1"}>공지 제목</Link>,
		author: <Avatar name="관리자" size="sm" />,
		created: <div className="flex items-center gap-1">2024-01-30</div>,
	},
	{
		num: 2,
		name: <Link href={"/announcements/2"}>공지 제목</Link>,
		author: <Avatar name="관리자" size="sm" />,
		created: <div className="flex items-center gap-1">2024-01-30</div>,
	},
];
