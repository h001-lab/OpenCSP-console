"use client";

import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout/Layout";
import { Button, Tag, ConfirmModal } from "@h001/ui";
import AdminListPanel from "@/components/admin/AdminListPanel";
import { useAdminProtection } from "@/hooks/useAdminProtection";
import { useMsg } from "@/providers/MessagesProvider";

// Types and Interfaces
type ProvisionStatus =
  | "PENDING" | "APPLYING" | "APPLIED" | "FAILED"
  | "DESTROYING" | "DESTROYED";

interface ProvisionItem {
  id: number;
  crName: string;
  moduleType: string;
  userId: string;
  vmId: number | null;
  proxmoxNode: string | null;
  vmHostname: string | null;
  status: ProvisionStatus;
  createdAt: string;
  updatedAt: string;
}

type TagType = "success" | "warning" | "error" | "info";

function statusTagType(status: ProvisionStatus): TagType | undefined {
  switch (status) {
    case "APPLIED":    return "success";
    case "APPLYING":   return "warning";
    case "PENDING":    return "info";
    case "FAILED":     return "error";
    case "DESTROYING": return "warning";
    case "DESTROYED":  return undefined;
  }
}

const ALL_STATUSES: ProvisionStatus[] = [
  "PENDING", "APPLYING", "APPLIED", "FAILED", "DESTROYING", "DESTROYED",
];

interface InfraMessages {
  title: string;
  description: string;
  loading: string;
  syncBtn: string;
  syncing: string;
  refresh: string;
  empty: string;
  syncComplete: string;
  resourceCount: string;
  delete: string;
  deleteFailed: string;
  syncFailed: string;
  search: string;
  filterStatus: string;
  filterModule: string;
  columns: { crName: string; module: string; user: string; status: string; updated: string };
  confirm: {
    sync: { title: string; message: string; confirm: string; cancel: string };
    delete: { title: string; message: string; deleting: string; confirm: string; cancel: string };
  };
}

// Main
export default function InfrastructurePage() {
  const isAdmin = useAdminProtection();
  const adminMsg = useMsg("Admin") as unknown as { infrastructure: InfraMessages } | undefined;

  const [items, setItems] = useState<ProvisionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [confirmSync, setConfirmSync] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<ProvisionItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<ProvisionStatus | "">("");
  const [filterModule, setFilterModule] = useState("");

  const t = adminMsg?.infrastructure;

  async function fetchItems() {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/provisions");
      const json = await res.json();
      setItems(json.data ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function handleSync() {
    if (!t) return;
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await fetch("/api/admin/provisions", { method: "POST" });
      const json = await res.json();
      if (!res.ok) { setSyncMsg(t.syncFailed); return; }
      const d = json.data ?? {};
      setSyncMsg(t.syncComplete
        .replace("{total}", String(d.total ?? 0))
        .replace("{created}", String(d.created ?? 0))
        .replace("{skipped}", String(d.skipped ?? 0)));
      await fetchItems();
    } catch {
      setSyncMsg(t.syncFailed);
    } finally {
      setSyncing(false);
      setConfirmSync(false);
    }
  }

  async function handleDelete() {
    if (!t || !confirmDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/provisions/${encodeURIComponent(confirmDelete.crName)}`, { method: "DELETE" });
      if (!res.ok) { alert(t.deleteFailed); return; }
      setConfirmDelete(null);
      await fetchItems();
    } catch {
      alert(t.deleteFailed);
    } finally {
      setDeleting(false);
    }
  }

  useEffect(() => { if (isAdmin) fetchItems(); }, [isAdmin]);

  const moduleOptions = useMemo(() => [...new Set(items.map((i) => i.moduleType))].sort(), [items]);
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter((item) => {
      if (filterStatus && item.status !== filterStatus) return false;
      if (filterModule && item.moduleType !== filterModule) return false;
      if (q && !item.crName.toLowerCase().includes(q) && !item.userId.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, search, filterStatus, filterModule]);

  if (!isAdmin || !t) return null;

  const panelTitle = t.resourceCount.replace("{count}", String(filtered.length));

  const actions = (
    <>
      <Button variant="outline" size="sm" onClick={fetchItems}>{t.refresh}</Button>
      <Button variant="default" size="sm" onClick={() => setConfirmSync(true)} disabled={syncing}>
        {syncing ? t.syncing : t.syncBtn}
      </Button>
    </>
  );

  const filters = (
    <>
      <select
        className="border rounded px-2 py-1 text-xs"
        value={filterStatus}
        onChange={(e) => setFilterStatus(e.target.value as ProvisionStatus | "")}
      >
        <option value="">{t.filterStatus}</option>
        {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      <select
        className="border rounded px-2 py-1 text-xs"
        value={filterModule}
        onChange={(e) => setFilterModule(e.target.value)}
      >
        <option value="">{t.filterModule}</option>
        {moduleOptions.map((m) => <option key={m} value={m}>{m}</option>)}
      </select>
    </>
  );

  return (
    <Layout navDomain="Nav" sidebarDomain="Admin">
      <main className="p-4 gap-4">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-700 mb-1">{t.title}</h2>
          <p className="text-xs text-gray-500">{t.description}</p>
          <hr className="mt-2" />
        </div>

        {syncMsg && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-sm text-blue-800">
            {syncMsg}
          </div>
        )}

        <AdminListPanel
          title={panelTitle}
          actions={actions}
          filters={filters}
          searchValue={search}
          onSearch={setSearch}
          searchPlaceholder={t.search}
          loading={loading}
          loadingText={t.loading}
        >
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-sm text-gray-400">{t.empty}</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b bg-gray-50/50">
                  <th className="text-left px-4 py-2 font-medium">{t.columns.crName}</th>
                  <th className="text-left px-4 py-2 font-medium">{t.columns.module}</th>
                  <th className="text-left px-4 py-2 font-medium">{t.columns.user}</th>
                  <th className="text-left px-4 py-2 font-medium">{t.columns.status}</th>
                  <th className="text-left px-4 py-2 font-medium">{t.columns.updated}</th>
                  <th className="px-4 py-2 w-20" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id} className="border-b last:border-b-0 hover:bg-gray-50/50">
                    <td className="px-4 py-2.5 font-mono text-xs font-semibold text-gray-700">
                      {item.crName}
                      {item.vmHostname && (
                        <div className="text-gray-400 font-sans font-normal">{item.vmHostname}</div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-600">{item.moduleType}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-600 max-w-32 truncate">{item.userId}</td>
                    <td className="px-4 py-2.5">
                      <Tag type={statusTagType(item.status)}>{item.status}</Tag>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-400">
                      {new Date(item.updatedAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(item)}>
                        {t.delete}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </AdminListPanel>
      </main>

      <ConfirmModal
        open={confirmSync}
        title={t.confirm.sync.title}
        message={t.confirm.sync.message}
        confirmText={syncing ? t.syncing : t.confirm.sync.confirm}
        cancelText={t.confirm.sync.cancel}
        onConfirm={handleSync}
        onCancel={() => setConfirmSync(false)}
      />

      <ConfirmModal
        open={!!confirmDelete}
        title={t.confirm.delete.title}
        message={t.confirm.delete.message.replace("{name}", confirmDelete?.crName ?? "")}
        confirmText={deleting ? t.confirm.delete.deleting : t.confirm.delete.confirm}
        cancelText={t.confirm.delete.cancel}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </Layout>
  );
}
