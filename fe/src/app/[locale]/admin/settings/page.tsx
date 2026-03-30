"use client";

import { useEffect, useState } from "react";
import { Button, Tabs, TabPanel, Tab, TabList, NotificationBanner, ConfirmModal } from "@h001/ui";
import Layout from "@/components/Layout/Layout";
import { useAdminProtection } from "@/hooks/useAdminProtection";
import { useMsg } from "@/providers/MessagesProvider";

// ─── 타입 ────────────────────────────────────────────────────────────────────

interface NewsItem {
  id: number;
  title: string;
  content: string;
  category: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

interface NewsMessages {
  add: string;
  loading: string;
  empty: string;
  backToList: string;
  editTitle: string;
  createTitle: string;
  fields: { title: string; category: string; published: string; content: string };
  save: string;
  saving: string;
  cancel: string;
  columns: { title: string; category: string; published: string; createdAt: string };
  actions: { edit: string; delete: string };
  status: { visible: string; hidden: string };
  deleteConfirm: { title: string; message: string; confirm: string; cancel: string };
  categories: string[];
}

interface BannerMessages {
  preview: string;
  previewEmpty: string;
  settings: string;
  messageLabel: string;
  messagePlaceholder: string;
  linkLabel: string;
  apply: string;
  applying: string;
  saved: string;
}

interface SettingsMessages {
  title: string;
  sub_title_1: string;
  tabs: { tab_1: { title: string }; tab_2: { title: string } };
  news: NewsMessages;
  banner: BannerMessages;
}

interface ComponentsMessages {
  Banner: { linkLabel: string };
}

// ─── News 탭 ──────────────────────────────────────────────────────────────────

function NewsTab() {
  const adminMsg = useMsg("Admin") as unknown as { settings: SettingsMessages } | undefined;
  const [items, setItems]         = useState<NewsItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [editing, setEditing]     = useState<NewsItem | null>(null);
  const [creating, setCreating]   = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<NewsItem | null>(null);
  const [saving, setSaving]       = useState(false);
  const [form, setForm] = useState({ title: "", content: "", category: "공지", published: true });

  useEffect(() => { fetchNews(); }, []);

  if (!adminMsg) return null;
  const t = adminMsg.settings.news;

  async function fetchNews() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/news");
      const json = await res.json();
      setItems(json.data ?? []);
    } finally { setLoading(false); }
  }

  function openCreate() {
    setForm({ title: "", content: "", category: t.categories[0] ?? "공지", published: true });
    setEditing(null);
    setCreating(true);
  }

  function openEdit(item: NewsItem) {
    setForm({ title: item.title, content: item.content, category: item.category, published: item.published });
    setEditing(item);
    setCreating(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (editing) {
        await fetch(`/api/admin/news/${editing.id}`, {
          method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
        });
      } else {
        await fetch("/api/admin/news", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
        });
      }
      setCreating(false);
      await fetchNews();
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await fetch(`/api/admin/news/${deleteTarget.id}`, { method: "DELETE" });
    setDeleteTarget(null);
    await fetchNews();
  }

  const inputCls = "w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500";
  const labelCls = "block text-xs font-medium text-gray-600 mb-1";

  if (creating) {
    return (
      <div className="mt-3">
        <button onClick={() => setCreating(false)} className="text-sm text-gray-500 hover:text-gray-800 mb-4">{t.backToList}</button>
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="px-5 py-3 border-b bg-gray-50">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{editing ? t.editTitle : t.createTitle}</p>
          </div>
          <div className="px-5 py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className={labelCls}>{t.fields.title} <span className="text-red-500">*</span></label>
                <input type="text" className={inputCls} value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>{t.fields.category}</label>
                <select className={inputCls} value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                  {t.categories.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2 pt-5">
                <input type="checkbox" id="published" checked={form.published}
                  onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked }))} />
                <label htmlFor="published" className="text-sm text-gray-700">{t.fields.published}</label>
              </div>
              <div className="col-span-2">
                <label className={labelCls}>{t.fields.content}</label>
                <textarea className={`${inputCls} h-32 resize-none`} value={form.content}
                  onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} />
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Button variant="default" size="sm" onClick={handleSave} disabled={saving || !form.title.trim()}>
            {saving ? t.saving : t.save}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCreating(false)}>{t.cancel}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3">
      <div className="flex justify-end mb-3">
        <Button variant="default" size="sm" onClick={openCreate}>{t.add}</Button>
      </div>
      <div className="bg-white rounded-lg border overflow-hidden">
        {loading ? (
          <div className="text-center py-10 text-sm text-gray-400">{t.loading}</div>
        ) : items.length === 0 ? (
          <div className="text-center py-10 text-sm text-gray-400">{t.empty}</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b bg-gray-50">
                <th className="text-left px-4 py-2 font-medium">{t.columns.title}</th>
                <th className="text-left px-4 py-2 font-medium w-20">{t.columns.category}</th>
                <th className="text-left px-4 py-2 font-medium w-20">{t.columns.published}</th>
                <th className="text-left px-4 py-2 font-medium w-32">{t.columns.createdAt}</th>
                <th className="px-4 py-2 w-24" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b last:border-b-0 hover:bg-gray-50/50">
                  <td className="px-4 py-2.5 text-gray-800">{item.title}</td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{item.category}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs font-medium ${item.published ? "text-green-600" : "text-gray-400"}`}>
                      {item.published ? t.status.visible : t.status.hidden}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-400">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex gap-1 justify-end">
                      <Button variant="outline" size="sm" onClick={() => openEdit(item)}>{t.actions.edit}</Button>
                      <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(item)}>{t.actions.delete}</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmModal
        open={!!deleteTarget}
        title={t.deleteConfirm.title}
        message={t.deleteConfirm.message.replace("{title}", deleteTarget?.title ?? "")}
        confirmText={t.deleteConfirm.confirm}
        cancelText={t.deleteConfirm.cancel}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

// ─── Banner 탭 ────────────────────────────────────────────────────────────────

function BannerTab() {
  const adminMsg = useMsg("Admin") as unknown as { settings: SettingsMessages } | undefined;
  const compMsg  = useMsg("Components") as unknown as ComponentsMessages | undefined;
  const [message, setMessage]   = useState("");
  const [link, setLink]         = useState("");
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);

  useEffect(() => {
    fetch("/api/public/banner")
      .then((r) => r.json())
      .then((d) => { setMessage(d.message ?? ""); setLink(d.link ?? ""); })
      .catch(() => {});
  }, []);

  if (!adminMsg || !compMsg) return null;
  const t = adminMsg.settings.banner;

  async function saveConfig(key: string, value: string) {
    await fetch("/api/admin/configs", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: "GENERAL", key, value, sensitive: false }),
    });
  }

  async function handleApply() {
    setSaving(true);
    setSaved(false);
    try {
      await Promise.all([
        saveConfig("banner.message", message),
        saveConfig("banner.link",    link),
      ]);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally { setSaving(false); }
  }

  const inputCls = "w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500";

  return (
    <div className="mt-3 space-y-4">
      {/* 미리보기 */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="px-5 py-3 border-b bg-gray-50">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t.preview}</p>
        </div>
        <div className="px-5 py-4">
          {message ? (
            <NotificationBanner linkLabel={compMsg.Banner.linkLabel} linkHref={link || undefined} preview>
              {message}
            </NotificationBanner>
          ) : (
            <p className="text-sm text-gray-400">{t.previewEmpty}</p>
          )}
        </div>
      </div>

      {/* 설정 */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="px-5 py-3 border-b bg-gray-50">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t.settings}</p>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t.messageLabel}</label>
            <textarea className={`${inputCls} h-20 resize-none`} value={message}
              onChange={(e) => setMessage(e.target.value)} placeholder={t.messagePlaceholder} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t.linkLabel}</label>
            <input type="text" className={inputCls} value={link}
              onChange={(e) => setLink(e.target.value)} placeholder="https://..." />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="default" size="sm" onClick={handleApply} disabled={saving}>
          {saving ? t.applying : t.apply}
        </Button>
        {saved && <span className="text-sm text-green-600">{t.saved}</span>}
      </div>
    </div>
  );
}

// ─── 메인 페이지 ──────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const isAdmin = useAdminProtection();
  const adminMsg = useMsg("Admin") as unknown as { settings: SettingsMessages } | undefined;
  if (!isAdmin || !adminMsg) return null;

  const t = adminMsg.settings;

  return (
    <Layout navDomain="Nav" sidebarDomain="Admin">
      <main className="p-3 gap-3">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">{t.title}</h2>
          <hr />
        </div>

        <div className="mt-3">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">{t.sub_title_1}</h2>
        </div>

        <div className="mt-3 p-4 border rounded-lg shadow-sm bg-white">
          <Tabs defaultTab="news">
            <TabList>
              <Tab id="news">{t.tabs.tab_1.title}</Tab>
              <Tab id="banner">{t.tabs.tab_2.title}</Tab>
            </TabList>

            <TabPanel id="news">
              <NewsTab />
            </TabPanel>

            <TabPanel id="banner">
              <BannerTab />
            </TabPanel>
          </Tabs>
        </div>
      </main>
    </Layout>
  );
}
