"use client";

import { useEffect, useState } from "react";
import { Button, Tabs, TabPanel, Tab, TabList, NotificationBanner, ConfirmModal } from "@h001/ui";
import Layout from "@/components/Layout/Layout";
import { useAdminProtection } from "@/hooks/useAdminProtection";
import { useMsg } from "@/providers/MessagesProvider";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHead, CardBody } from "@/components/ui/card";

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

// news
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

  const inputStyle: React.CSSProperties = {
    width: "100%", border: "1px solid var(--border-2)", borderRadius: "var(--r-sm)",
    padding: "6px 10px", fontSize: "13px", color: "var(--fg-primary)",
    background: "var(--bg-surface)", outline: "none",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: "12px", fontWeight: 500, color: "var(--fg-secondary)", marginBottom: 4,
  };

  if (creating) {
    return (
      <div style={{ marginTop: 12 }}>
        <button
          onClick={() => setCreating(false)}
          style={{ fontSize: "12.5px", color: "var(--fg-muted)", background: "none", border: "none", cursor: "pointer", marginBottom: 12, padding: 0 }}
        >
          ← {t.backToList}
        </button>
        <Card>
          <CardHead title={editing ? t.editTitle : t.createTitle} />
          <CardBody>
            <div style={{ display: "grid", gap: 16 }}>
              <div>
                <label style={labelStyle}>{t.fields.title} <span style={{ color: "var(--danger-600)" }}>*</span></label>
                <input type="text" style={inputStyle} value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
              </div>
              <div style={{ display: "flex", gap: 16, alignItems: "flex-end" }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>{t.fields.category}</label>
                  <select style={inputStyle} value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                    {t.categories.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 2 }}>
                  <input type="checkbox" id="published" checked={form.published}
                    onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked }))} />
                  <label htmlFor="published" style={{ fontSize: "13px", color: "var(--fg-secondary)" }}>{t.fields.published}</label>
                </div>
              </div>
              <div>
                <label style={labelStyle}>{t.fields.content}</label>
                <textarea style={{ ...inputStyle, height: 128, resize: "none" }} value={form.content}
                  onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} />
              </div>
            </div>
          </CardBody>
        </Card>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <Button variant="default" size="sm" onClick={handleSave} disabled={saving || !form.title.trim()}>
            {saving ? t.saving : t.save}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCreating(false)}>{t.cancel}</Button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
        <Button variant="default" size="sm" onClick={openCreate}>{t.add}</Button>
      </div>
      <Card>
        {loading ? (
          <CardBody style={{ textAlign: "center", padding: "40px 16px", color: "var(--fg-muted)", fontSize: "13px" }}>{t.loading}</CardBody>
        ) : items.length === 0 ? (
          <CardBody style={{ textAlign: "center", padding: "40px 16px", color: "var(--fg-muted)", fontSize: "13px" }}>{t.empty}</CardBody>
        ) : (
          <table style={{ width: "100%", fontSize: "13px", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ fontSize: "12px", color: "var(--fg-muted)", borderBottom: "1px solid var(--border-1)", background: "var(--bg-subtle)" }}>
                <th style={{ textAlign: "left", padding: "8px 16px", fontWeight: 500 }}>{t.columns.title}</th>
                <th style={{ textAlign: "left", padding: "8px 16px", fontWeight: 500, width: 128 }}>{t.columns.category}</th>
                <th style={{ textAlign: "left", padding: "8px 16px", fontWeight: 500, width: 80 }}>{t.columns.published}</th>
                <th style={{ textAlign: "left", padding: "8px 16px", fontWeight: 500, width: 128 }}>{t.columns.createdAt}</th>
                <th style={{ padding: "8px 16px", width: 96 }} />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} style={{ borderBottom: "1px solid var(--border-1)" }} className="news-row">
                  <td style={{ padding: "10px 16px", color: "var(--fg-primary)" }}>{item.title}</td>
                  <td style={{ padding: "10px 16px" }}>
                    <span style={{ fontSize: "11.5px", background: "var(--neutral-50)", color: "var(--neutral-600)", padding: "2px 8px", borderRadius: "var(--r-xs)", whiteSpace: "nowrap" }}>{item.category}</span>
                  </td>
                  <td style={{ padding: "10px 16px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 500, color: item.published ? "var(--ok-600)" : "var(--fg-muted)" }}>
                      {item.published ? t.status.visible : t.status.hidden}
                    </span>
                  </td>
                  <td style={{ padding: "10px 16px", fontSize: "12px", color: "var(--fg-muted)" }}>
                    {new Date(item.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: "10px 16px", textAlign: "right" }}>
                    <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                      <Button variant="outline" size="sm" onClick={() => openEdit(item)}>{t.actions.edit}</Button>
                      <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(item)}>{t.actions.delete}</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <style>{`.news-row:last-child { border-bottom: none; } .news-row:hover { background: var(--bg-hover); }`}</style>

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


// Baaner
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

  const inputStyle: React.CSSProperties = {
    width: "100%", border: "1px solid var(--border-2)", borderRadius: "var(--r-sm)",
    padding: "6px 10px", fontSize: "13px", color: "var(--fg-primary)",
    background: "var(--bg-surface)", outline: "none",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: "12px", fontWeight: 500, color: "var(--fg-secondary)", marginBottom: 4,
  };

  return (
    <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 16 }}>
      <Card>
        <CardHead title={t.preview} />
        <CardBody>
          {message ? (
            <NotificationBanner linkLabel={compMsg.Banner.linkLabel} linkHref={link || undefined} preview>
              {message}
            </NotificationBanner>
          ) : (
            <p style={{ margin: 0, fontSize: "13px", color: "var(--fg-muted)" }}>{t.previewEmpty}</p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHead title={t.settings} />
        <CardBody style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={labelStyle}>{t.messageLabel}</label>
            <textarea style={{ ...inputStyle, height: 80, resize: "none" }} value={message}
              onChange={(e) => setMessage(e.target.value)} placeholder={t.messagePlaceholder} />
          </div>
          <div>
            <label style={labelStyle}>{t.linkLabel}</label>
            <input type="text" style={inputStyle} value={link}
              onChange={(e) => setLink(e.target.value)} placeholder="https://..." />
          </div>
        </CardBody>
      </Card>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Button variant="default" size="sm" onClick={handleApply} disabled={saving}>
          {saving ? t.applying : t.apply}
        </Button>
        {saved && <span style={{ fontSize: "13px", color: "var(--ok-600)" }}>{t.saved}</span>}
      </div>
    </div>
  );
}


// main
export default function SettingsPage() {
  const isAdmin = useAdminProtection();
  const adminMsg = useMsg("Admin") as unknown as { settings: SettingsMessages } | undefined;
  if (!isAdmin || !adminMsg) return null;

  const t = adminMsg.settings;

  return (
    <Layout navDomain="Nav" sidebarDomain="Admin">
      <PageHeader title={t.title} subtitle={t.sub_title_1} />

      <Card>
        <CardBody style={{ padding: "16px" }}>
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
        </CardBody>
      </Card>
    </Layout>
  );
}
