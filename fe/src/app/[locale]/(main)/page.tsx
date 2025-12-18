"use client";

import Layout from "@/components/Layout/Layout";
import { useMsg } from "@/providers/MessagesProvider";
import { MainPageMessage } from "./types";
import { ImageBanner } from "@h001/ui";

export default function Page() {
	const t = useMsg("Home") as unknown as MainPageMessage;
	if (!t) return null;

	return (
		<Layout navDomain="Nav" sidebarDomain="Home" >
			<div className="p-6 w-full">
				<h1 className="text-2xl font-bold mb-4">{t.title}</h1>
				<p>{t.description}</p>
			</div>
			<div className="flex gap-4 max-w-screen mx-auto px-4">
				<ImageBanner src="/images/giphy.gif" alt="gif test" href="/images/giphy.gif" newTab={true} />
				<ImageBanner src="/images/google.png" alt="Banner" href="/images/google.png" />
				<ImageBanner src="/images/google.png" alt="Banner" href="/images/google.png" newTab={true} />
			</div>
		</Layout>
	);
}
