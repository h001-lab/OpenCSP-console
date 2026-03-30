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

interface NewsMessages {
  title: string;
  loading: string;
  empty: string;
}

const CATEGORY_STYLE: Record<string, string> = {
  업데이트: "bg-blue-100 text-blue-700",
  점검: "bg-yellow-100 text-yellow-700",
  보안: "bg-red-100 text-red-700",
  공지: "bg-gray-100 text-gray-600",
};

export default function NewsPage() {
  const t = useMsg("News") as unknown as NewsMessages | undefined;
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/public/news")
      .then((r) => r.json())
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (!t) return null;

  return (
    <Layout navDomain="Nav" sidebarDomain="Home">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">{t.title}</h1>

        {loading ? (
          <p className="text-sm text-gray-400">{t.loading}</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-gray-400">{t.empty}</p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <Link
                key={item.id}
                href={`/news/${item.id}`}
                className="block bg-white border border-gray-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <span className="font-semibold text-gray-900 text-sm">{item.title}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                      CATEGORY_STYLE[item.category] ?? "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {item.category}
                  </span>
                </div>
                {item.content && (
                  <p className="text-xs text-gray-500 mb-2 line-clamp-2">{item.content}</p>
                )}
                <p className="text-xs text-gray-400">
                  {new Date(item.createdAt).toLocaleDateString()}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
