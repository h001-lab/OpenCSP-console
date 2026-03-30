"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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
  loading: string;
  notFound: string;
  backToList: string;
}

const CATEGORY_STYLE: Record<string, string> = {
  업데이트: "bg-blue-100 text-blue-700",
  점검: "bg-yellow-100 text-yellow-700",
  보안: "bg-red-100 text-red-700",
  공지: "bg-gray-100 text-gray-600",
};

export default function NewsDetailPage() {
  const t = useMsg("News") as unknown as NewsMessages | undefined;
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/public/news/${id}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.json();
      })
      .then((data) => { if (data) setItem(data); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (!t) return null;

  return (
    <Layout navDomain="Nav" sidebarDomain="Home">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link href="/news" className="text-sm text-gray-500 hover:text-gray-800 mb-6 inline-block">
          {t.backToList}
        </Link>

        {loading ? (
          <p className="text-sm text-gray-400">{t.loading}</p>
        ) : notFound || !item ? (
          <p className="text-sm text-gray-400">{t.notFound}</p>
        ) : (
          <article className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-start justify-between gap-3 mb-3">
              <h1 className="text-xl font-bold text-gray-900">{item.title}</h1>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 mt-1 ${
                  CATEGORY_STYLE[item.category] ?? "bg-gray-100 text-gray-600"
                }`}
              >
                {item.category}
              </span>
            </div>
            <p className="text-xs text-gray-400 mb-6">
              {new Date(item.createdAt).toLocaleDateString()}
            </p>
            <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {item.content}
            </div>
          </article>
        )}
      </div>
    </Layout>
  );
}
