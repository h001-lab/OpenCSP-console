"use client";

import Link from "next/link";
import { useState } from "react";

export function Banner() {
	const [visible, setVisible] = useState(true);
	if (!visible) return null;

	return (
		<header
			className="
				bg-[#EDE3D4] 
				border-b 
				px-4 
				flex 
				items-center 
				justify-center 
				text-sm 
				text-gray-800 
				shadow-sm
				p-4
			"
		>
			{/* 중앙 텍스트 */}
			<div className="flex flex-col">
				<span className="text-center pointer-events-none">
					12월 신규 서비스 개발 중..
					<br />
					자세한 내용은 하단 링크 공지사항을 확인해주세요. <br />
				</span>
				<Link
					href="/announcements/1"
					className="mt-2 text-center text-blue-700 underline transition-colors hover:bg-gray-100 hover:text-blue-900"
				>
					공지사항 바로가기
				</Link>
			</div>
			{/* 오른쪽 닫기 버튼 */}
			<button
				className="
        			  absolute 
        			  right-4 
        			  text-gray-600 
        			  hover:text-black 
        			  text-lg 
        			  leading-none
        			"
				onClick={() => setVisible(false)}
			>
				✕
			</button>
		</header>
	);
}
