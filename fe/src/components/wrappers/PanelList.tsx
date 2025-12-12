"use client";


import { PanelItem } from "@/components/types";
import { Button, ListPanel } from "@h001/ui";

interface PanelListProps {
	items: PanelItem[];
}

export function PanelList({ items }: PanelListProps) {
	return (
		<div className="flex flex-col gap-4">
			{items.map((item, i) => (
				<ListPanel
					key={i}
					title={item.title}
					right={
						item.actionLabel ? (
							<Button variant="ghost">{item.actionLabel}</Button>
						) : null
					}
				>
					{item.description}
				</ListPanel>
			))}
		</div>
	);
}
