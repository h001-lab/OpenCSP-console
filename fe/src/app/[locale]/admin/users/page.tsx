"use client";

import Layout from "@/components/Layout/Layout";

export default function Page() {

    return (
        <Layout navDomain="Nav" sidebarDomain="Admin">
            <main className="p-3 gap-3">
                <div className="mb-6">
                    <h2 className="text-lg font-semibold text-gray-700 mb-2">
                        유저 관리 (User Management)
                    </h2>
                    <hr />
                </div>
            </main>
        </Layout>
    );
}
