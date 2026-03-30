"use client";

import { useEffect, useState } from "react";
import Layout from "@/components/Layout/Layout";
import { Button, Spinner, Tag, ConfirmModal } from "@h001/ui";
import { useAdminProtection } from "@/hooks/useAdminProtection";
import { useMsg } from "@/providers/MessagesProvider";

// ─── 타입 ───────────────────────────────────────────────────────────────────

interface ProvisionSummary {
  id: number;
  crName: string;
  moduleType: string;
  userId: string;
  vmId: number | null;
  proxmoxNode: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

type TagType = "success" | "warning" | "error" | "info";

function statusTagType(status?: string): TagType {
  switch (status) {
    case "APPLIED":
    case "READY":      return "success";
    case "APPLYING":
    case "PENDING":    return "warning";
    case "FAILED":     return "error";
    case "DESTROYING":
    case "DESTROYED":  return "info";
    default:           return "info";
  }
}

interface SyncResult {
  total: number;
  created: number;
  skipped: number;
}

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
  columns: { crName: string; module: string; user: string; status: string; updated: string };
  confirm: {
    sync: { title: string; message: string; confirm: string; cancel: string };
    delete: { title: string; message: string; deleting: string; confirm: string; cancel: string };
  };
}

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────────

export default function InfrastructurePage() {
  const isAdmin = useAdminProtection();
  const adminMsg = useMsg("Admin") as unknown as { infrastructure: InfraMessages } | undefined;
  const [provisions, setProvisions] = useState<ProvisionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [confirmSync, setConfirmSync] = useState(false);

  useEffect(() => {
    if (isAdmin) fetchProvisions();
  }, [isAdmin]);

  if (!isAdmin || !adminMsg) return null;

  const t = adminMsg.infrastructure;

  async function fetchProvisions() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/provisions");
      const json = await res.json();
      setProvisions(json.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    setConfirmSync(false);
    try {
      const res = await fetch("/api/admin/provisions", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || json.error || t.syncFailed);
      setSyncResult(json.data ?? null);
      await fetchProvisions();
    } catch (e) {
      setError(e instanceof Error ? e.message : t.syncFailed);
    } finally {
      setSyncing(false);
    }
  }

  async function handleDelete() {
    if (!confirmTarget) return;
    setDeleting(true);
    try {
      await fetch(`/api/admin/provisions/${confirmTarget}`, { method: "DELETE" });
      setConfirmTarget(null);
      await fetchProvisions();
    } catch (e) {
      alert(e instanceof Error ? e.message : t.deleteFailed);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Layout navDomain="Nav" sidebarDomain="Admin">
      <main className="p-3 gap-3">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-700 mb-1">{t.title}</h2>
          <p className="text-xs text-gray-500">{t.description}</p>
          <hr className="mt-2" />
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12 gap-3">
            <Spinner size="md" />
            <span className="text-sm text-gray-600">{t.loading}</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {syncResult && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-green-800">
              {t.syncComplete
                .replace("{total}", String(syncResult.total))
                .replace("{created}", String(syncResult.created))
                .replace("{skipped}", String(syncResult.skipped))}
            </p>
          </div>
        )}

        {!loading && !error && (
          <div className="bg-white rounded-lg border overflow-hidden">
            <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">
                {t.resourceCount.replace("{count}", String(provisions.length))}
              </h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setConfirmSync(true)} disabled={syncing}>
                  {syncing ? t.syncing : t.syncBtn}
                </Button>
                <Button variant="outline" size="sm" onClick={fetchProvisions}>
                  {t.refresh}
                </Button>
              </div>
            </div>

            {provisions.length === 0 ? (
              <div className="text-center py-12 text-sm text-gray-500">{t.empty}</div>
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
                  {provisions.map((item) => (
                    <tr key={item.crName} className="border-b last:border-b-0 hover:bg-gray-50/50">
                      <td className="px-4 py-2.5 font-mono text-xs text-gray-700">{item.crName}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-600">{item.moduleType}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-500 font-mono truncate max-w-30">{item.userId}</td>
                      <td className="px-4 py-2.5">
                        <Tag type={statusTagType(item.status)}>{item.status}</Tag>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-400">
                        {new Date(item.updatedAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setConfirmTarget(item.crName)}
                        >
                          {t.delete}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </main>

      <ConfirmModal
        open={confirmSync}
        title={t.confirm.sync.title}
        message={t.confirm.sync.message}
        confirmText={t.confirm.sync.confirm}
        cancelText={t.confirm.sync.cancel}
        onConfirm={handleSync}
        onCancel={() => setConfirmSync(false)}
      />

      <ConfirmModal
        open={!!confirmTarget}
        title={t.confirm.delete.title}
        message={t.confirm.delete.message.replace("{name}", confirmTarget ?? "")}
        confirmText={deleting ? t.confirm.delete.deleting : t.confirm.delete.confirm}
        cancelText={t.confirm.delete.cancel}
        onConfirm={handleDelete}
        onCancel={() => setConfirmTarget(null)}
      />
    </Layout>
  );
}
