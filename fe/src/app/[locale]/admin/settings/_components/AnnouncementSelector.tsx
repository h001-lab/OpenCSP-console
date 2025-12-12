"use client";

import { useLocale } from "@/providers/MessagesProvider";
import { Select } from "@h001/ui";

interface AnnouncementSelectorProps {
	onSelect?: (value: string) => void;
}

export function AnnouncementSelector({ onSelect }: AnnouncementSelectorProps) {
	const locale = useLocale();

	const items = [
		{ id: 1, title: "서비스 점검 안내" },
		{ id: 2, title: "신규 기능 업데이트" },
		{ id: 3, title: "개인정보 처리방침 변경" },
	];

	return (
		<Select
			onChange={(e) => {
				const value = e.target.value;
				if (onSelect) onSelect(value);
			}}
		>
			<option value="">링크 없음</option>

			{items.map((a) => (
				<option key={a.id} value={`/${locale}/announcements/${a.id}`}>
					{a.title ?? a.id}
				</option>
			))}
		</Select>
	);
}
