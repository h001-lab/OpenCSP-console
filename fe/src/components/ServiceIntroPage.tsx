"use client";

import Layout from "@/components/Layout/Layout";
import { useTypedMsg } from "@/hooks/useTypedMsg";
import { useAuthStore } from "@/stores/authStore";

interface ServiceIntroMessages {
  intro: {
    title: string;
    description: string;
    features: { title: string; desc: string }[];
    loginRequired: string;
  };
}

export function ServiceIntroPage({ domain }: { domain: string }) {
  const t = useTypedMsg<ServiceIntroMessages>(domain)?.intro;
  const { isAuthenticated } = useAuthStore();

  if (!t) return null;

  return (
    <Layout navDomain="Nav" sidebarDomain={domain}>
      <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
        <div className="max-w-lg">
          <h2 className="text-2xl font-bold text-gray-800 mb-3">{t.title}</h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-6 whitespace-pre-line">{t.description}</p>
          <div className="grid grid-cols-3 gap-4 mb-8 text-left">
            {t.features.map((item) => (
              <div key={item.title} className="bg-gray-50 rounded-lg p-3 border">
                <div className="text-xs font-semibold text-gray-700 mb-0.5">{item.title}</div>
                <div className="text-xs text-gray-500">{item.desc}</div>
              </div>
            ))}
          </div>
          {!isAuthenticated && <p className="text-sm text-gray-400">{t.loginRequired}</p>}
        </div>
      </div>
    </Layout>
  );
}
