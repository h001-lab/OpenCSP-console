"use client";

import { useEffect, useState } from "react";
import Layout from "@/components/Layout/Layout";
import { Button, Spinner, Tag, FormModal, ConfirmModal } from "@h001/ui";
import { useAdminProtection } from "@/hooks/useAdminProtection";
import { useMsg } from "@/providers/MessagesProvider";

// ─── 타입 ───────────────────────────────────────────────────────────────────

type NodeType   = "PROXMOX" | "KVM" | "OTHER";
type NodeStatus = "ACTIVE" | "ISOLATED" | "MAINTENANCE" | "OFFLINE";

interface NodeItem {
  id: number;
  uuid: string;
  hostname: string;
  ip: string;
  type: NodeType;
  status: NodeStatus;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

type TagType = "success" | "warning" | "error" | "info";

function statusTagType(status: NodeStatus): TagType {
  switch (status) {
    case "ACTIVE":      return "success";
    case "MAINTENANCE": return "warning";
    case "ISOLATED":    return "error";
    case "OFFLINE":     return "info";
  }
}

const STATUS_OPTIONS: NodeStatus[] = ["ACTIVE", "ISOLATED", "MAINTENANCE", "OFFLINE"];

interface NodesMessages {
  title: string;
  description: string;
  refresh: string;
  addNode: string;
  loading: string;
  empty: string;
  addFirst: string;
  delete: string;
  statusChangeFailed: string;
  columns: { hostname: string; ip: string; type: string; status: string; description: string; createdAt: string };
  form: {
    title: string; submitting: string; submit: string;
    hostname: { label: string; placeholder: string };
    ip: { label: string; placeholder: string };
    type: string;
    description: { label: string; placeholder: string };
    registerFailed: string;
  };
  confirm: {
    statusChange: { title: string; message: string; confirm: string; cancel: string };
    delete: { title: string; message: string; deleting: string; confirm: string; cancel: string };
  };
}

// ─── 노드 추가 폼 ─────────────────────────────────────────────────────────

function NodeForm({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const adminMsg = useMsg("Admin") as unknown as { nodes: NodesMessages } | undefined;
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ hostname: "", ip: "", type: "PROXMOX" as NodeType, description: "" });

  useEffect(() => {
    if (open) setForm({ hostname: "", ip: "", type: "PROXMOX", description: "" });
  }, [open]);

  if (!adminMsg) return null;
  const t = adminMsg.nodes;

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/nodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        alert(json.message ?? t.form.registerFailed);
        return;
      }
      onCreated();
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FormModal title={t.form.title} open={open} onSubmit={handleSubmit} onCancel={onClose}
      submitText={submitting ? t.form.submitting : t.form.submit}>
      <div className="flex flex-col gap-3 min-w-80">
        {[
          { key: "hostname", label: t.form.hostname.label, placeholder: t.form.hostname.placeholder },
          { key: "ip",       label: t.form.ip.label,       placeholder: t.form.ip.placeholder },
        ].map(({ key, label, placeholder }) => (
          <div key={key}>
            <label className="block text-xs font-medium text-gray-700 mb-1">{label} <span className="text-red-500">*</span></label>
            <input
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder={placeholder}
              value={(form as Record<string, string>)[key]}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
            />
          </div>
        ))}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">{t.form.type} <span className="text-red-500">*</span></label>
          <select
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as NodeType }))}>
            <option value="PROXMOX">PROXMOX</option>
            <option value="KVM">KVM</option>
            <option value="OTHER">OTHER</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">{t.form.description.label}</label>
          <input
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder={t.form.description.placeholder}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>
      </div>
    </FormModal>
  );
}

// ─── 메인 페이지 ───────────────────────────────────────────────────────────

export default function NodesPage() {
  const isAdmin = useAdminProtection();
  const adminMsg = useMsg("Admin") as unknown as { nodes: NodesMessages } | undefined;
  const [nodes, setNodes]                   = useState<NodeItem[]>([]);
  const [loading, setLoading]               = useState(true);
  const [formOpen, setFormOpen]             = useState(false);
  const [confirmDelete, setConfirmDelete]   = useState<NodeItem | null>(null);
  const [deleting, setDeleting]             = useState(false);
  const [statusTarget, setStatusTarget]     = useState<{ node: NodeItem; status: NodeStatus } | null>(null);

  useEffect(() => { if (isAdmin) fetchNodes(); }, [isAdmin]);

  if (!isAdmin || !adminMsg) return null;

  const t = adminMsg.nodes;

  async function fetchNodes() {
    try {
      setLoading(true);
      const res  = await fetch("/api/admin/nodes");
      const json = await res.json();
      setNodes(json.data ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await fetch(`/api/admin/nodes/${confirmDelete.uuid}`, { method: "DELETE" });
      setConfirmDelete(null);
      await fetchNodes();
    } finally {
      setDeleting(false);
    }
  }

  async function handleStatusChange() {
    if (!statusTarget) return;
    try {
      await fetch(`/api/admin/nodes/${statusTarget.node.uuid}?status=${statusTarget.status}`, { method: "PATCH" });
      setStatusTarget(null);
      await fetchNodes();
    } catch {
      alert(t.statusChangeFailed);
    }
  }

  return (
    <Layout navDomain="Nav" sidebarDomain="Admin">
      <main className="p-4 gap-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-700 mb-1">{t.title}</h2>
            <p className="text-xs text-gray-500">{t.description}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchNodes}>{t.refresh}</Button>
            <Button variant="default" size="sm" onClick={() => setFormOpen(true)}>{t.addNode}</Button>
          </div>
        </div>
        <hr className="mb-4" />

        {loading ? (
          <div className="flex items-center justify-center py-12 gap-3">
            <Spinner size="md" />
            <span className="text-sm text-gray-600">{t.loading}</span>
          </div>
        ) : (
          <div className="bg-white rounded-lg border overflow-hidden">
            {nodes.length === 0 ? (
              <div className="text-center py-16 text-sm text-gray-400">
                <p className="mb-3">{t.empty}</p>
                <Button variant="default" size="sm" onClick={() => setFormOpen(true)}>{t.addFirst}</Button>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 border-b bg-gray-50/50">
                    <th className="text-left px-4 py-2 font-medium">{t.columns.hostname}</th>
                    <th className="text-left px-4 py-2 font-medium">{t.columns.ip}</th>
                    <th className="text-left px-4 py-2 font-medium">{t.columns.type}</th>
                    <th className="text-left px-4 py-2 font-medium">{t.columns.status}</th>
                    <th className="text-left px-4 py-2 font-medium">{t.columns.description}</th>
                    <th className="text-left px-4 py-2 font-medium">{t.columns.createdAt}</th>
                    <th className="px-4 py-2 w-32" />
                  </tr>
                </thead>
                <tbody>
                  {nodes.map((node) => (
                    <tr key={node.uuid} className="border-b last:border-b-0 hover:bg-gray-50/50">
                      <td className="px-4 py-2.5 font-mono text-xs font-semibold text-gray-700">{node.hostname}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-gray-600">{node.ip}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-600">{node.type}</td>
                      <td className="px-4 py-2.5">
                        <Tag type={statusTagType(node.status)}>{node.status}</Tag>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-400 max-w-48 truncate">{node.description ?? "-"}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-400">{new Date(node.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1.5">
                          <select
                            className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none"
                            value={node.status}
                            onChange={(e) => setStatusTarget({ node, status: e.target.value as NodeStatus })}>
                            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                          <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(node)}>{t.delete}</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </main>

      <NodeForm open={formOpen} onClose={() => setFormOpen(false)} onCreated={fetchNodes} />

      <ConfirmModal
        open={!!statusTarget}
        title={t.confirm.statusChange.title}
        message={t.confirm.statusChange.message
          .replace("{hostname}", statusTarget?.node.hostname ?? "")
          .replace("{status}", statusTarget?.status ?? "")}
        confirmText={t.confirm.statusChange.confirm}
        cancelText={t.confirm.statusChange.cancel}
        onConfirm={handleStatusChange}
        onCancel={() => setStatusTarget(null)}
      />

      <ConfirmModal
        open={!!confirmDelete}
        title={t.confirm.delete.title}
        message={t.confirm.delete.message.replace("{hostname}", confirmDelete?.hostname ?? "")}
        confirmText={deleting ? t.confirm.delete.deleting : t.confirm.delete.confirm}
        cancelText={t.confirm.delete.cancel}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </Layout>
  );
}
