"use client";

import { useSession } from "next-auth/react";
import Layout from "@/components/Layout/Layout";
import { useMsg } from "@/providers/MessagesProvider";

interface UserSettingsMessages {
  title: string;
  description: string;
  profile: {
    title: string;
    name: string;
    email: string;
    roles: string;
    notAvailable: string;
  };
  preferences: {
    title: string;
    language: string;
    languageOptions: { value: string; label: string }[];
  };
}

export default function UserSettingsPage() {
  const t = useMsg("UserSettings") as unknown as UserSettingsMessages;
  const { data: session } = useSession();
  if (!t) return null;

  const user = session?.user;
  const roles: string[] = (session as { roles?: string[] })?.roles ?? [];

  return (
    <Layout navDomain="Nav" sidebarDomain="UserSettings">
      <div className="p-6 max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
          <p className="text-sm text-gray-500 mt-1">{t.description}</p>
        </div>

        {/* Profile */}
        <section className="mb-6 bg-white rounded-lg border overflow-hidden">
          <div className="px-5 py-3 border-b bg-gray-50">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {t.profile.title}
            </h2>
          </div>
          <div className="px-5 py-4 space-y-4">
            <Field label={t.profile.name} value={user?.name ?? t.profile.notAvailable} />
            <Field label={t.profile.email} value={user?.email ?? t.profile.notAvailable} />
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1">{t.profile.roles}</p>
              <div className="flex flex-wrap gap-1">
                {roles.length > 0 ? (
                  roles.map((r) => (
                    <span key={r} className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded font-mono">
                      {r}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-gray-400">{t.profile.notAvailable}</span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Preferences */}
        <section className="bg-white rounded-lg border overflow-hidden">
          <div className="px-5 py-3 border-b bg-gray-50">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {t.preferences.title}
            </h2>
          </div>
          <div className="px-5 py-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {t.preferences.language}
              </label>
              <select
                className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                onChange={(e) => {
                  const locale = e.target.value;
                  window.location.href = `/${locale}${window.location.pathname.replace(/^\/[a-z]{2}/, "")}`;
                }}
              >
                {t.preferences.languageOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-600 mb-1">{label}</p>
      <p className="text-sm text-gray-800">{value}</p>
    </div>
  );
}
