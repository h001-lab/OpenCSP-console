import Layout from "@/components/Layout/Layout";

interface PageProps {
	params: {
		announcement: string;
	};
}

export default function AnnouncementPage({ params }: PageProps) {
	const { announcement } = params;

	return (
		<Layout navDomain="Nav" sidebarDomain="Announcements">
			<div className="flex flex-col gap-4">
				<h1 className="text-2xl font-bold">공지 상세 페이지</h1>

				<div className="text-gray-600 text-sm">ID: {announcement}</div>

				<div className="border p-4 rounded bg-white shadow-sm">
					<p>여기에 공지 내용 또는 API 요청 결과를 렌더링하면 됩니다.</p>
				</div>
			</div>
		</Layout>
	);
}
