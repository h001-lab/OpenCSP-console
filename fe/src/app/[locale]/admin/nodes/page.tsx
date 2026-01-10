"use client";

import Layout from "@/components/Layout/Layout";
import { useAutoMsg } from "@/providers/MessagesProvider";
import { NodesPageMessage } from "../types";

export default function Page() {
    const t = useAutoMsg() as unknown as NodesPageMessage;
    if (!t) return null;

    return (
        <Layout navDomain="Nav" sidebarDomain="Admin">
            <main className="p-3 gap-3">
                <div className="mb-6">
                    <h2 className="text-lg font-semibold text-gray-700 mb-2">
                        {t?.nodes.title || "Nodes"}
                    </h2>
                    <hr />
                </div>
            </main>
        </Layout>
    );
}
