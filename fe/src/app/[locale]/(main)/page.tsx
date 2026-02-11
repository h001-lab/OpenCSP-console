"use client";

import Layout from "@/components/Layout/Layout";
import { useMsg } from "@/providers/MessagesProvider";
import { MainPageMessage } from "./types";


export default function Page() {
	const t = useMsg("Home") as unknown as MainPageMessage;
	if (!t) return null;

	return (
		<Layout navDomain="Nav" sidebarDomain="Home" >
			<div className="flex flex-col gap-4">
				<div className="p-6 w-full">
					<h1 className="text-2xl font-bold mb-4">{t.title}</h1>
					<p>{t.description}</p>
				</div>
				{/*
				<div className="flex gap-4 w-[1200px] mx-auto">
					<ImageBanner src="/images/giphy.gif" alt="gif test" href="/images/giphy.gif" newTab={true} />
					<ImageBanner src="/images/google.png" alt="Banner" href="/images/google.png" />
					<ImageBanner src="/images/google.png" alt="Banner" href="/images/google.png" newTab={true} />
				</div> */}
				{/* <div className="w-[1200px] mx-auto border p-4 rounded-lg">
					<h3 className="mb-4 font-bold text-lg">추천 아이템</h3>
					<SimpleCarousel>
						{cards.map((card) => (
							<div
								key={card.id}
								className="w-[160px] h-[200px] rounded-lg p-4 text-white flex flex-col justify-end shadow-md transition-transform hover:scale-105"
								style={{ backgroundColor: card.color }}
							>
								<span className="font-bold text-lg">{card.title}</span>
								<span className="text-xs opacity-80">{card.desc}</span>
							</div>
						))}
					</SimpleCarousel>
				</div> */}
				{/* <div>
					<div className="flex flex-col gap-2">
						<BaseVideoPlayer autoPlay={true} muted={true} src="http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" />
						<p className="text-center text-sm text-gray-500">
							소리 없이 자동 재생되는 배너
						</p>
					</div>
				</div> */}
			</div>
		</Layout>
	);
}
