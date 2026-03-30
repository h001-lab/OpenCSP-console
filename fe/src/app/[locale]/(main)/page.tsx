"use client";

import { useEffect, useState } from "react";
import Layout from "@/components/Layout/Layout";
import { Link, useMsg } from "@/providers/MessagesProvider";

interface NewsItem {
  id: number;
  title: string;
  category: string;
  content: string;
  createdAt: string;
}

const CATEGORY_STYLE: Record<string, string> = {
  업데이트: "bg-blue-100 text-blue-700",
  점검: "bg-yellow-100 text-yellow-700",
  보안: "bg-red-100 text-red-700",
  공지: "bg-gray-100 text-gray-600",
};

interface HomeMessages {
  hero: { title: string; description: string };
  news: { title: string; viewAll: string; empty: string };
  quickAccess: { title: string };
  quickLinks: { label: string; description: string; href: string }[];
  gettingStarted: { title: string; steps: string[] };
}

export default function Page() {
  const t = useMsg("Home") as unknown as HomeMessages | undefined;
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);

  useEffect(() => {
    fetch("/api/public/news")
      .then((r) => r.json())
      .then((data) => setNewsItems(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  if (!t) return null;

  return (
    <Layout navDomain="Nav" sidebarDomain="Home">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">
        {/* Hero */}
        <section>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t.hero.title}</h1>
          <p className="text-gray-500 text-base max-w-2xl">{t.hero.description}</p>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* News — 2/3 */}
          <section className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">{t.news.title}</h2>
              <Link href="/news" className="text-sm text-blue-600 hover:underline">
                {t.news.viewAll}
              </Link>
            </div>
            <div className="space-y-3">
              {newsItems.length === 0 ? (
                <p className="text-sm text-gray-400 py-4">{t.news.empty}</p>
              ) : (
                newsItems.map((item) => (
                  <Link
                    key={item.id}
                    href={`/news/${item.id}`}
                    className="block bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <span className="font-medium text-gray-900 text-sm">{item.title}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                          CATEGORY_STYLE[item.category] ?? "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {item.category}
                      </span>
                    </div>
                    {item.content && (
                      <p className="text-xs text-gray-500 mb-1 line-clamp-2">{item.content}</p>
                    )}
                    <p className="text-xs text-gray-400">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </p>
                  </Link>
                ))
              )}
            </div>
          </section>

          {/* Right column — 1/3 */}
          <div className="space-y-6">
            {/* Quick Access */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">{t.quickAccess.title}</h2>
              <div className="space-y-2">
                {t.quickLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
                  >
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{link.label}</p>
                      <p className="text-xs text-gray-500">{link.description}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            {/* Getting Started */}
            <section className="bg-linear-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-900 mb-3">{t.gettingStarted.title}</h3>
              <ol className="space-y-2">
                {t.gettingStarted.steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-blue-800">
                    <span className="w-4 h-4 bg-blue-200 rounded-full flex items-center justify-center text-blue-700 font-bold shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </section>
          </div>
        </div>
      </div>
    </Layout>
  );
}
