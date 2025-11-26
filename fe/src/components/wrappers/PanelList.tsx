"use client";

import { Button } from "@/components/ui/Button/Button";
import { PanelItem } from "@/components/types";
import { ListPanel } from "@/components/ui/ListPanel/ListPanel";

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
