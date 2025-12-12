"use client";

import Layout from "@/components/Layout/Layout";

export default function Page() {
	return (
		<Layout navDomain="Nav" sidebarDomain="Home" >
			<div className="p-6 w-full">
				<h1 className="text-2xl font-bold mb-4">title</h1>
				{/* <p>{t.description}</p> */}
			</div>
		</Layout>
	);
}
