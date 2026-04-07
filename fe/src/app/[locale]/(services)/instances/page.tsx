"use client";

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import Layout from "@/components/Layout/Layout";
import { Button, Spinner, Tag, ConfirmModal } from "@h001/ui";
import { useMsg } from "@/providers/MessagesProvider";
import { useAuthStore } from "@/stores/authStore";

const TerminalOverlay = dynamic(() => import("@/components/Console/TerminalOverlay"), { ssr: false });

// 타입
interface K8sCondition {
  type: string;
  status: string;
  reason?: string;
  message?: string;
}

type SemaphoreStatus = "PENDING" | "RUNNING" | "SUCCESS" | "FAILED";

interface ProvisionSummary {
  id: number;
  provisionTaskId: string | null;
  crName: string;
  moduleType: string;
  userId: string;
  vmId: number | null;
  proxmoxNode: string | null;
  vmHostname: string | null;
  status: string;
  semaphoreStatus: SemaphoreStatus | null;
  semaphoreTaskId: number | null;
  createdAt: string;
  updatedAt: string;
  liveStatus?: { conditions?: K8sCondition[] } | null;
}

interface HistoryEntry {
  id: number;
  crName: string;
  userId: string;
  moduleType: string;
  action: string;
  fromStatus: string | null;
  toStatus: string | null;
  detail: string | null;
  createdAt: string;
}

interface InstancesMessages {
  intro: {
    title: string;
    description: string;
    features: { title: string; desc: string }[];
    viewList: string;
    loginRequired: string;
  };
  create: {
    backToList: string;
    title: string;
    description: string;
    sections: { basic: string; resources: string; network: string };
    fields: {
      vmName: string; vmId: string; cpu: string; memory: string; disk: string;
      ipConfig: string; dhcp: string; staticIp: string; ipAddress: string; gateway: string;
    };
    submit: string;
    submitting: string;
    cancel: string;
    errors: { vmName: string; ipAddress: string; gateway: string };
    failed: string;
  };
  list: {
    title: string;
    description: string;
    refresh: string;
    add: string;
    deleteSelected: string;
    tabs: { active: string; history: string };
    loading: string;
    search: string;
    perPage: string;
    empty: { noData: string; noResults: string };
    columns: { vmId: string; user: string; crName: string; node: string; created: string; updated: string; status: string };
    deleteFailed: string;
    pageInfo: string;
  };
  detail: {
    backToList: string;
    fields: { vmId: string; crName: string; moduleType: string; node: string; userId: string; status: string; createdAt: string; updatedAt: string };
    actions: { console: string; edit: string; stop: string; delete: string; semaphore?: string; semaphoreNoOutput?: string };
    notReady: string;
    deleteFailed: string;
    terraformError: string;
    terraformHint: string;
    deleteConfirm: { title: string; messageSingle: string; messageMulti: string; deleting: string; confirm: string; cancel: string };
  };
}

function extractErrorMessage(p: ProvisionSummary): string | null {
  const conditions = p.liveStatus?.conditions;
  if (!conditions) return null;
  const failed = conditions.find((c) => c.type === "Ready" && c.status === "False");
  return failed?.message ?? failed?.reason ?? null;
}

// ─── 히스토리 테이블 ──────────────────────────────────────────────────────
function HistoryTable({ entries }: { entries: HistoryEntry[] }) {
  const t = (useMsg("Instances") as unknown as InstancesMessages | undefined)?.list;
  const [search, setSearch] = useState("");
  const [page, setPage]     = useState(0);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const pageSize = 20;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const list = entries.filter((e) =>
      [e.crName, e.userId, e.action, e.fromStatus ?? "", e.toStatus ?? ""].some((v) => v.toLowerCase().includes(q))
    );
    list.sort((a, b) => {
      const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortDir === "asc" ? diff : -diff;
    });
    return list;
  }, [entries, search, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage   = Math.min(page, totalPages - 1);
  const paged      = filtered.slice(safePage * pageSize, (safePage + 1) * pageSize);

  if (!t) return null;

  function actionBadge(action: string) {
    const cls = action === "CREATED"
      ? "bg-green-50 text-green-700 border-green-200"
      : "bg-blue-50 text-blue-700 border-blue-200";
    return <span className={`text-xs border px-1.5 py-0.5 rounded font-mono ${cls}`}>{action}</span>;
  }

  function statusBadge(s: string | null) {
    if (!s) return <span className="text-gray-300">—</span>;
    const cls = s === "APPLIED" ? "text-green-700" : s === "FAILED" ? "text-red-600" : s === "DESTROYED" ? "text-gray-500" : "text-yellow-700";
    return <span className={`font-mono text-xs ${cls}`}>{s}</span>;
  }

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <div className="px-4 py-3 border-b bg-gray-50">
        <input type="text" placeholder={t.search}
          className="w-full max-w-sm border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
      </div>

      {paged.length === 0 ? (
        <div className="text-center py-12 text-sm text-gray-400">
          {entries.length === 0 ? t.empty.noData : t.empty.noResults}
        </div>
      ) : (
        <>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b bg-gray-50/50">
                <th className="text-left px-4 py-2 font-medium">{t.columns.crName}</th>
                <th className="text-left px-4 py-2 font-medium">{t.columns.user}</th>
                <th className="text-left px-4 py-2 font-medium">Action</th>
                <th className="text-left px-4 py-2 font-medium">From</th>
                <th className="text-left px-4 py-2 font-medium">To</th>
                <th className="text-left px-4 py-2 font-medium">Detail</th>
                <th className="text-left px-4 py-2 font-medium">
                  <button
                    onClick={() => { setSortDir((d) => d === "asc" ? "desc" : "asc"); setPage(0); }}
                    className="flex items-center gap-1 hover:text-gray-800 transition-colors"
                  >
                    {t.columns.created}
                    <span className="text-gray-400">{sortDir === "asc" ? "↑" : "↓"}</span>
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {paged.map((e) => (
                <tr key={e.id} className="border-b last:border-b-0 hover:bg-gray-50/30">
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-700">{e.crName}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500 font-mono truncate max-w-28">{e.userId}</td>
                  <td className="px-4 py-2.5">{actionBadge(e.action)}</td>
                  <td className="px-4 py-2.5">{statusBadge(e.fromStatus)}</td>
                  <td className="px-4 py-2.5">{statusBadge(e.toStatus)}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-400 max-w-48 truncate" title={e.detail ?? ""}>{e.detail ?? "—"}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-400 whitespace-nowrap">{new Date(e.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2 border-t bg-gray-50 flex items-center justify-between text-xs text-gray-500">
            <span>{t.pageInfo.replace("{from}", String(safePage * pageSize + 1)).replace("{to}", String(Math.min((safePage + 1) * pageSize, filtered.length))).replace("{total}", String(filtered.length))}</span>
            <div className="flex items-center gap-1">
              <button className="px-2 py-1 rounded hover:bg-gray-200 disabled:opacity-30" disabled={safePage === 0} onClick={() => setPage(0)}>«</button>
              <button className="px-2 py-1 rounded hover:bg-gray-200 disabled:opacity-30" disabled={safePage === 0} onClick={() => setPage((p) => p - 1)}>‹</button>
              <span className="px-2">{safePage + 1} / {totalPages}</span>
              <button className="px-2 py-1 rounded hover:bg-gray-200 disabled:opacity-30" disabled={safePage >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>›</button>
              <button className="px-2 py-1 rounded hover:bg-gray-200 disabled:opacity-30" disabled={safePage >= totalPages - 1} onClick={() => setPage(totalPages - 1)}>»</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

type SortKey = keyof Pick<ProvisionSummary, "vmId" | "userId" | "crName" | "proxmoxNode" | "updatedAt" | "createdAt">;
type SortDir = "asc" | "desc";
type TagType = "success" | "warning" | "error" | "info";
type IpMode  = "dhcp" | "static";
type Tab     = "active" | "history";

function statusTagType(status?: string): TagType {
  switch (status) {
    case "APPLIED":                      return "success";
    case "APPLYING": case "PENDING":     return "warning";
    case "FAILED":                       return "error";
    case "DESTROYING": case "DESTROYED": return "info";
    default:                             return "info";
  }
}

function SemaphoreStatusBadge({ status, taskId }: { status: SemaphoreStatus | null; taskId: number | null }) {
  if (!status) return <span className="text-gray-300 text-xs">—</span>;
  const cfg: Record<SemaphoreStatus, { label: string; cls: string }> = {
    PENDING: { label: "Pending",  cls: "bg-gray-100 text-gray-500 border-gray-200" },
    RUNNING: { label: "Running",  cls: "bg-yellow-50 text-yellow-700 border-yellow-200" },
    SUCCESS: { label: "Success",  cls: "bg-green-50 text-green-700 border-green-200" },
    FAILED:  { label: "Failed",   cls: "bg-red-50 text-red-700 border-red-200" },
  };
  const { label, cls } = cfg[status];
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded border font-mono ${cls}`}
      title={taskId != null ? `Semaphore Task #${taskId}` : undefined}>
      {status === "RUNNING" && <span className="animate-pulse">●</span>}
      {label}
      {taskId != null && <span className="opacity-60">#{taskId}</span>}
    </span>
  );
}

const DEFAULT_MODULE_TYPE = "proxmox-vm";
const DEFAULT_GIT_REPO    = "flux-system";
const PAGE_SIZE_OPTIONS   = [5, 10, 25];

// VM 폼
function ProvisionCreateView({ onBack, onCreated }: { onBack: () => void; onCreated: () => void }) {
  const t = (useMsg("Instances") as unknown as InstancesMessages | undefined)?.create;
  const [submitting, setSubmitting] = useState(false);
  const [vars, setVars] = useState<Record<string, string>>({});
  const [ipMode, setIpMode] = useState<IpMode>("dhcp");

  useEffect(() => {
    setVars({});
    setIpMode("dhcp");
    fetch("/api/provisions/next-vm-id")
      .then((r) => r.json())
      .then((json) => {
        const id = String(json.data ?? "");
        setVars({ vm_id: id, vm_name: id ? `vm-${id}` : "" });
      })
      .catch(() => {});
  }, []);

  if (!t) return null;

  function field(key: string) {
    return {
      value: vars[key] ?? "",
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setVars((v) => ({ ...v, [key]: e.target.value })),
    };
  }

  async function handleSubmit() {
    if (!vars["vm_name"]?.trim()) { alert(t!.errors.vmName); return; }
    if (ipMode === "static") {
      if (!vars["vm_ip"]?.trim())  { alert(t!.errors.ipAddress); return; }
      if (!vars["vm_gw"]?.trim())  { alert(t!.errors.gateway);   return; }
    }
    setSubmitting(true);
    try {
      const vmFields = [
        { key: "vm_name",      type: "text",   defaultValue: "" },
        { key: "vm_id",        type: "number", defaultValue: "" },
        { key: "vm_cpu",       type: "number", defaultValue: "2" },
        { key: "vm_memory",    type: "number", defaultValue: "2048" },
        { key: "vm_disk_size", type: "number", defaultValue: "20" },
      ];
      const builtVars: Record<string, string | number> = {};
      for (const f of vmFields) {
        const val = vars[f.key] ?? f.defaultValue ?? "";
        builtVars[f.key] = f.type === "number" ? Number(val) : val;
      }
      if (ipMode === "static") {
        builtVars["vm_ip"] = vars["vm_ip"]?.trim() ?? "";
        builtVars["vm_gw"] = vars["vm_gw"]?.trim() ?? "";
      }
      const res = await fetch("/api/provisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleType: DEFAULT_MODULE_TYPE, gitRepositoryName: DEFAULT_GIT_REPO, vars: builtVars }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        alert(json.message ?? t!.failed);
        return;
      }
      onCreated();
      onBack();
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls = "w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500";
  const labelCls = "block text-xs font-medium text-gray-600 mb-1";

  return (
    <div>
      <button onClick={onBack}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors">
        {t.backToList}
      </button>

      <div className="mb-6">
        <h3 className="font-semibold text-gray-800 text-lg">{t.title}</h3>
        <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>
      </div>

      <div className="bg-white rounded-lg border overflow-hidden mb-4">
        <div className="px-5 py-3 border-b bg-gray-50">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t.sections.basic}</p>
        </div>
        <div className="px-5 py-4 grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>{t.fields.vmName} <span className="text-red-500">*</span></label>
            <input type="text" className={inputCls} placeholder="my-vm" {...field("vm_name")} />
          </div>
          <div>
            <label className={labelCls}>{t.fields.vmId} <span className="text-red-500">*</span></label>
            <input type="number" className={inputCls} {...field("vm_id")} />
          </div>
        </div>

        <div className="px-5 py-3 border-t border-b bg-gray-50">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t.sections.resources}</p>
        </div>
        <div className="px-5 py-4 grid grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>{t.fields.cpu}</label>
            <input type="number" className={inputCls} placeholder="2" {...field("vm_cpu")} />
          </div>
          <div>
            <label className={labelCls}>{t.fields.memory}</label>
            <input type="number" className={inputCls} placeholder="2048" {...field("vm_memory")} />
          </div>
          <div>
            <label className={labelCls}>{t.fields.disk}</label>
            <input type="number" className={inputCls} placeholder="20" {...field("vm_disk_size")} />
          </div>
        </div>

        <div className="px-5 py-3 border-t border-b bg-gray-50">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t.sections.network}</p>
        </div>
        <div className="px-5 py-4">
          <label className={labelCls}>{t.fields.ipConfig}</label>
          <div className="flex gap-2 mb-3 w-48">
            {(["dhcp", "static"] as IpMode[]).map((mode) => (
              <button key={mode} type="button" onClick={() => setIpMode(mode)}
                className={`flex-1 py-1.5 text-xs rounded border transition-colors ${
                  ipMode === mode
                    ? "bg-gray-800 text-white border-gray-800"
                    : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
                }`}>
                {mode === "dhcp" ? t.fields.dhcp : t.fields.staticIp}
              </button>
            ))}
          </div>
          {ipMode === "static" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>{t.fields.ipAddress} <span className="text-red-500">*</span></label>
                <input type="text" className={inputCls} placeholder="192.168.1.100/24" {...field("vm_ip")} />
              </div>
              <div>
                <label className={labelCls}>{t.fields.gateway} <span className="text-red-500">*</span></label>
                <input type="text" className={inputCls} placeholder="192.168.1.1" {...field("vm_gw")} />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="default" size="sm" onClick={handleSubmit} disabled={submitting}>
          {submitting ? t.submitting : t.submit}
        </Button>
        <Button variant="outline" size="sm" onClick={onBack} disabled={submitting}>
          {t.cancel}
        </Button>
      </div>
    </div>
  );
}

// 소개 뷰
function IntroView({ isAuthenticated }: { isAuthenticated: boolean }) {
  const t = (useMsg("Instances") as unknown as InstancesMessages | undefined)?.intro;
  if (!t) return null;

  return (
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
        {isAuthenticated ? (
          <a
            href="?view=list"
            className="inline-block px-5 py-2 text-sm bg-gray-800 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            {t.viewList}
          </a>
        ) : (
          <p className="text-sm text-gray-400">{t.loginRequired}</p>
        )}
      </div>
    </div>
  );
}

// ─── 디테일 뷰 ────────────────────────────────────────────────────────────

function InstanceDetail({
  provision,
  onBack,
  onDeleted,
}: {
  provision: ProvisionSummary;
  onBack: () => void;
  onDeleted: () => void;
}) {
  const t = (useMsg("Instances") as unknown as InstancesMessages | undefined)?.detail;
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting]           = useState(false);
  const [consoleOpen, setConsoleOpen]     = useState(false);

  // Semaphore task 결과
  const [semaphoreResult, setSemaphoreResult] = useState<{
    status: string; success: boolean; output: string; taskId: number | null;
  } | null>(null);
  const [semaphoreLoading, setSemaphoreLoading] = useState(false);
  const [semaphoreOpen, setSemaphoreOpen]       = useState(false);

  // SSH 접근 스크립트
  const [teleportProxyUrl, setTeleportProxyUrl] = useState("");
  const [sshUser, setSshUser]                   = useState("ubuntu");
  const [scriptOpen, setScriptOpen]             = useState(false);
  const [curlCopied, setCurlCopied]             = useState(false);
  const [scriptCopied, setScriptCopied]         = useState(false);

  useEffect(() => {
    fetch("/api/provisions/access-config")
      .then(r => r.json())
      .then(json => setTeleportProxyUrl(json.data?.teleportProxyUrl ?? ""))
      .catch(() => {});
  }, []);

  async function handleSemaphoreSync() {
    setSemaphoreLoading(true);
    try {
      const res = await fetch(`/api/admin/provisions/${provision.crName}/semaphore`);
      const json = await res.json();
      setSemaphoreResult(json.data ?? json);
      setSemaphoreOpen(true);
    } catch {
      setSemaphoreResult({ status: "error", success: false, output: "Request failed", taskId: null });
      setSemaphoreOpen(true);
    } finally {
      setSemaphoreLoading(false);
    }
  }

  if (!t) return null;

  async function handleDelete() {
    setDeleting(true);
    try {
      await fetch(`/api/provisions/${provision.crName}`, { method: "DELETE" });
      setConfirmDelete(false);
      onDeleted();
    } catch {
      alert(t!.deleteFailed);
    } finally {
      setDeleting(false);
    }
  }

  const isActive     = !["DESTROYING", "DESTROYED"].includes(provision.status);
  const isFailed     = provision.status === "FAILED";
  const errorMessage = extractErrorMessage(provision);

  const fields: { label: string; value: React.ReactNode }[] = [
    { label: t.fields.vmId,        value: provision.vmId ?? "-" },
    { label: t.fields.crName,      value: <span className="font-mono text-xs">{provision.crName}</span> },
    { label: t.fields.moduleType,  value: provision.moduleType },
    { label: t.fields.node,        value: provision.proxmoxNode ?? "-" },
    { label: t.fields.userId,      value: <span className="font-mono text-xs">{provision.userId}</span> },
    { label: t.fields.status,      value: <Tag type={statusTagType(provision.status)}>{provision.status}</Tag> },
    { label: t.fields.createdAt,   value: new Date(provision.createdAt).toLocaleString() },
    { label: t.fields.updatedAt,   value: new Date(provision.updatedAt).toLocaleString() },
  ];

  return (
    <div>
      <button onClick={onBack}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors">
        {t.backToList}
      </button>

      {isFailed && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <span className="text-sm font-medium text-red-700">{t.terraformError}</span>
          </div>
          {errorMessage && (
            <pre className="mt-2 text-xs text-red-600 bg-red-100 rounded p-3 overflow-x-auto whitespace-pre-wrap wrap-break-word">
              {errorMessage}
            </pre>
          )}
          <p className="text-xs text-red-500 mt-2">{t.terraformHint}</p>
        </div>
      )}

      <div className="bg-white rounded-lg border overflow-hidden mb-4">
        <div className="px-5 py-4 border-b bg-gray-50 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-800 font-mono text-sm">{provision.crName}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{provision.moduleType}</p>
          </div>
          <Tag type={statusTagType(provision.status)}>{provision.status}</Tag>
        </div>
        <dl className="divide-y">
          {fields.map(({ label, value }) => (
            <div key={label} className="px-5 py-3 flex items-center gap-4">
              <dt className="text-xs text-gray-500 w-32 shrink-0">{label}</dt>
              <dd className="text-sm text-gray-800">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="default" size="sm" disabled={provision.status !== "APPLIED"} onClick={() => setConsoleOpen(true)}>
          {t.actions.console}
        </Button>
        <Button variant="outline" size="sm" disabled={!isActive} onClick={() => alert(t.notReady)}>
          {t.actions.edit}
        </Button>
        <Button variant="outline" size="sm" disabled={!isActive} onClick={() => alert(t.notReady)}>
          {t.actions.stop}
        </Button>
        <Button variant="outline" size="sm" onClick={handleSemaphoreSync} disabled={semaphoreLoading}>
          {semaphoreLoading ? "..." : t.actions.semaphore ?? "Semaphore Log"}
        </Button>
        <Button variant="destructive" size="sm" disabled={!isActive} onClick={() => setConfirmDelete(true)}>
          {t.actions.delete}
        </Button>
      </div>

      {semaphoreOpen && semaphoreResult && (
        <div className="mt-4 bg-white rounded-lg border overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-700">Semaphore Task</span>
              {semaphoreResult.taskId != null && (
                <span className="text-xs font-mono text-gray-400">#{semaphoreResult.taskId}</span>
              )}
              <span className={`text-xs px-2 py-0.5 rounded border font-mono ${
                semaphoreResult.status === "success"
                  ? "bg-green-50 text-green-700 border-green-200"
                  : semaphoreResult.status === "error" || semaphoreResult.status === "failed"
                  ? "bg-red-50 text-red-700 border-red-200"
                  : semaphoreResult.status === "not_triggered"
                  ? "bg-gray-50 text-gray-500 border-gray-200"
                  : "bg-yellow-50 text-yellow-700 border-yellow-200"
              }`}>
                {semaphoreResult.status}
              </span>
            </div>
            <button onClick={() => setSemaphoreOpen(false)} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
          </div>
          {semaphoreResult.output ? (
            <pre className="p-4 text-xs font-mono text-gray-700 bg-gray-950 text-green-400 overflow-x-auto whitespace-pre-wrap max-h-96 overflow-y-auto">
              {semaphoreResult.output}
            </pre>
          ) : (
            <p className="p-4 text-xs text-gray-400">{t.actions.semaphoreNoOutput ?? "No output available"}</p>
          )}
        </div>
      )}

      {/* SSH 접근 가이드 */}
      {provision.status === "APPLIED" && provision.vmHostname && (() => {
        const installUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/api/install?proxy=${encodeURIComponent(teleportProxyUrl)}&host=${encodeURIComponent(provision.vmHostname ?? "")}&user=${encodeURIComponent(sshUser)}`;
        const curlCmd    = `curl -sL "${installUrl}" | bash`;
        // 스크립트가 ~/.ssh/config에 short hostname alias를 추가하므로 짧은 형식으로 표시
        const sshCmd     = `ssh ${sshUser}@${provision.vmHostname}`;
        return (
          <div className="mt-4 bg-white rounded-lg border overflow-hidden">
            <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-700">SSH Access</span>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <label className="text-xs text-gray-500">User</label>
                  <input
                    className="border rounded px-2 py-1 text-xs font-mono w-24 focus:outline-none focus:ring-1 focus:ring-blue-300"
                    value={sshUser}
                    onChange={e => setSshUser(e.target.value)}
                  />
                </div>
                <button onClick={() => setScriptOpen(v => !v)}
                  className="text-xs text-gray-500 hover:text-gray-800 underline underline-offset-2">
                  {scriptOpen ? "Hide script" : "Show script"}
                </button>
              </div>
            </div>
            <div className="p-4 flex flex-col gap-3">
              {/* curl 명령어 */}
              <div>
                <p className="text-xs text-gray-500 mb-1.5">Run once to install tsh and configure SSH:</p>
                <div className="flex items-center gap-2 bg-gray-950 rounded px-3 py-2.5">
                  <code className="flex-1 text-xs text-green-400 font-mono truncate">{curlCmd}</code>
                  <button
                    onClick={() => { navigator.clipboard.writeText(curlCmd); setCurlCopied(true); setTimeout(() => setCurlCopied(false), 2000); }}
                    className="shrink-0 text-xs text-gray-400 hover:text-white px-2 py-1 rounded border border-gray-700 hover:border-gray-500 transition-colors"
                  >
                    {curlCopied ? "✓" : "Copy"}
                  </button>
                </div>
              </div>

              {/* SSH 명령어 */}
              <div>
                <p className="text-xs text-gray-500 mb-1.5">Then connect:</p>
                <div className="flex items-center gap-2 bg-gray-950 rounded px-3 py-2.5">
                  <code className="flex-1 text-xs text-green-400 font-mono">{sshCmd}</code>
                  <button
                    onClick={() => navigator.clipboard.writeText(sshCmd)}
                    className="shrink-0 text-xs text-gray-400 hover:text-white px-2 py-1 rounded border border-gray-700 hover:border-gray-500 transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </div>

              {/* 전체 스크립트 토글 */}
              {scriptOpen && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs text-gray-500">Full script</p>
                    <button
                      onClick={() => { fetch(installUrl).then(r => r.text()).then(s => { navigator.clipboard.writeText(s); setScriptCopied(true); setTimeout(() => setScriptCopied(false), 2000); }); }}
                      className="text-xs text-gray-400 hover:text-gray-700 underline"
                    >
                      {scriptCopied ? "✓ Copied" : "Copy script"}
                    </button>
                  </div>
                  <iframe
                    src={installUrl}
                    className="w-full h-72 rounded border border-gray-800 bg-gray-950 text-xs font-mono"
                    title="install script"
                  />
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {consoleOpen && (
        <TerminalOverlay crName={provision.crName} login="root" onClose={() => setConsoleOpen(false)} />
      )}

      <ConfirmModal
        open={confirmDelete}
        title={t.deleteConfirm.title}
        message={t.deleteConfirm.messageSingle.replace("{name}", provision.crName)}
        confirmText={deleting ? t.deleteConfirm.deleting : t.deleteConfirm.confirm}
        cancelText={t.deleteConfirm.cancel}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}

// ─── 인스턴스 테이블 ──────────────────────────────────────────────────────

function InstanceTable({
  provisions,
  selected,
  onSelectChange,
  onRowClick,
}: {
  provisions: ProvisionSummary[];
  selected: Set<string>;
  onSelectChange: (next: Set<string>) => void;
  onRowClick: (p: ProvisionSummary) => void;
}) {
  const t = (useMsg("Instances") as unknown as InstancesMessages | undefined)?.list;
  const [search, setSearch]     = useState("");
  const [sortKey, setSortKey]   = useState<SortKey>("updatedAt");
  const [sortDir, setSortDir]   = useState<SortDir>("desc");
  const [page, setPage]         = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return provisions.filter((p) =>
      [p.crName, p.userId, p.proxmoxNode ?? "", String(p.vmId ?? ""), p.status]
        .some((v) => v.toLowerCase().includes(q))
    );
  }, [provisions, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = String(a[sortKey] ?? "");
      const bv = String(b[sortKey] ?? "");
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage   = Math.min(page, totalPages - 1);
  const paged      = sorted.slice(safePage * pageSize, (safePage + 1) * pageSize);

  if (!t) return null;

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  const allPageSelected = paged.length > 0 && paged.every((p) => selected.has(p.crName));

  function toggleAll() {
    const next = new Set(selected);
    if (allPageSelected) paged.forEach((p) => next.delete(p.crName));
    else paged.forEach((p) => next.add(p.crName));
    onSelectChange(next);
  }

  function toggleOne(crName: string) {
    const next = new Set(selected);
    if (next.has(crName)) next.delete(crName); else next.add(crName);
    onSelectChange(next);
  }

  function sortIcon(key: SortKey) {
    if (sortKey !== key) return <span className="text-gray-300 ml-1">↕</span>;
    return <span className="text-blue-500 ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  const COLUMNS: { key: SortKey; label: string }[] = [
    { key: "vmId",        label: t.columns.vmId },
    { key: "userId",      label: t.columns.user },
    { key: "crName",      label: t.columns.crName },
    { key: "proxmoxNode", label: t.columns.node },
    { key: "createdAt",   label: t.columns.created },
    { key: "updatedAt",   label: t.columns.updated },
  ];

  const from  = safePage * pageSize + 1;
  const to    = Math.min((safePage + 1) * pageSize, filtered.length);
  const total = filtered.length;

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <div className="px-4 py-3 border-b bg-gray-50 flex items-center gap-2">
        <input type="text" placeholder={t.search}
          className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
        />
        <select className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none"
          value={pageSize}
          onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}>
          {PAGE_SIZE_OPTIONS.map((n) => (
            <option key={n} value={n}>{t.perPage.replace("{count}", String(n))}</option>
          ))}
        </select>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-12 text-sm text-gray-400">
          {provisions.length === 0 ? t.empty.noData : t.empty.noResults}
        </div>
      ) : (
        <>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b bg-gray-50/50">
                <th className="px-4 py-2 w-10">
                  <input type="checkbox" checked={allPageSelected} onChange={toggleAll} />
                </th>
                {COLUMNS.map((col) => (
                  <th key={col.key}
                    className="text-left px-4 py-2 font-medium cursor-pointer select-none hover:text-gray-700"
                    onClick={() => toggleSort(col.key)}>
                    {col.label}{sortIcon(col.key)}
                  </th>
                ))}
                <th className="text-left px-4 py-2 font-medium">{t.columns.status}</th>
                <th className="text-left px-4 py-2 font-medium">Ansible</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((item) => (
                <tr key={item.crName}
                  className="border-b last:border-b-0 hover:bg-blue-50/40 cursor-pointer"
                  onClick={() => onRowClick(item)}>
                  <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selected.has(item.crName)}
                      onChange={() => toggleOne(item.crName)} />
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-600">{item.vmId ?? "-"}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500 font-mono truncate max-w-28">{item.userId}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-700">{item.crName}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-600">{item.proxmoxNode ?? "-"}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-400">{new Date(item.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-400">{new Date(item.updatedAt).toLocaleString()}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <Tag type={statusTagType(item.status)}>{item.status}</Tag>
                      {item.status === "FAILED" && (
                        <span title={extractErrorMessage(item) ?? "Terraform error"}>
                          <svg className="w-3.5 h-3.5 text-red-400 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                          </svg>
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <SemaphoreStatusBadge status={item.semaphoreStatus} taskId={item.semaphoreTaskId} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="px-4 py-2 border-t bg-gray-50 flex items-center justify-between text-xs text-gray-500">
            <span>{t.pageInfo.replace("{from}", String(from)).replace("{to}", String(to)).replace("{total}", String(total))}</span>
            <div className="flex items-center gap-1">
              <button className="px-2 py-1 rounded hover:bg-gray-200 disabled:opacity-30" disabled={safePage === 0} onClick={() => setPage(0)}>«</button>
              <button className="px-2 py-1 rounded hover:bg-gray-200 disabled:opacity-30" disabled={safePage === 0} onClick={() => setPage((p) => p - 1)}>‹</button>
              <span className="px-2">{safePage + 1} / {totalPages}</span>
              <button className="px-2 py-1 rounded hover:bg-gray-200 disabled:opacity-30" disabled={safePage >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>›</button>
              <button className="px-2 py-1 rounded hover:bg-gray-200 disabled:opacity-30" disabled={safePage >= totalPages - 1} onClick={() => setPage(totalPages - 1)}>»</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── 메인 페이지 ───────────────────────────────────────────────────────────

export default function InstancesPage() {
  const instancesMsg = useMsg("Instances") as unknown as InstancesMessages | undefined;
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();

  const searchParams = useSearchParams();
  const showList = searchParams.get("view") === "list";

  const [provisions, setProvisions]         = useState<ProvisionSummary[]>([]);
  const [histories, setHistories]           = useState<HistoryEntry[]>([]);
  const [loading, setLoading]               = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError]                   = useState<string | null>(null);
  const [creating, setCreating]             = useState(false);
  const [selected, setSelected]             = useState<Set<string>>(new Set());
  const [confirmTargets, setConfirmTargets] = useState<string[]>([]);
  const [deleting, setDeleting]             = useState(false);
  const [detail, setDetail]                 = useState<ProvisionSummary | null>(null);
  const [tab, setTab]                       = useState<Tab>("active");

  const activeProvisions = useMemo(() => provisions.filter((p) => p.status !== "DESTROYED"), [provisions]);

  useEffect(() => {
    if (isAuthenticated) fetchProvisions();
  }, [isAuthenticated]);

  // PENDING/APPLYING/DESTROYING 상태가 있을 때 30초마다 자동 갱신 (스피너 없이 백그라운드 fetch)
  useEffect(() => {
    if (!isAuthenticated || !showList || creating || detail !== null) return;
    const hasInProgress = provisions.some((p) =>
      ["PENDING", "APPLYING", "DESTROYING"].includes(p.status)
    );
    if (!hasInProgress) return;

    const id = setInterval(async () => {
      try {
        const res = await fetch("/api/provisions");
        const json = await res.json();
        setProvisions(json.data ?? []);
      } catch {
        // 백그라운드 폴링 오류는 무시
      }
    }, 30_000);
    return () => clearInterval(id);
  }, [isAuthenticated, showList, creating, detail, provisions]);

  if (!instancesMsg) return null;

  const tList   = instancesMsg.list;
  const tDetail = instancesMsg.detail;

  async function fetchProvisions() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/provisions");
      const json = await res.json();
      setProvisions(json.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function fetchHistories() {
    try {
      setHistoryLoading(true);
      const res = await fetch("/api/provisions/history");
      const json = await res.json();
      setHistories(json.data ?? []);
    } catch {
      // silently ignore
    } finally {
      setHistoryLoading(false);
    }
  }

  function handleTabChange(next: Tab) {
    setTab(next);
    setSelected(new Set());
    if (next === "history") fetchHistories();
  }

  async function handleBulkDelete() {
    setDeleting(true);
    try {
      await Promise.all(
        confirmTargets.map((crName) => fetch(`/api/provisions/${crName}`, { method: "DELETE" }))
      );
      setConfirmTargets([]);
      setSelected(new Set());
      await fetchProvisions();
    } catch {
      alert(tList.deleteFailed);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Layout navDomain="Nav" sidebarDomain="Instances">
      <main className="p-4 gap-4">
        {!showList ? (
          <IntroView isAuthenticated={isAuthenticated} />
        ) : authLoading ? (
          <div className="flex items-center justify-center py-24 gap-3">
            <Spinner size="md" />
          </div>
        ) : !isAuthenticated ? (
          <IntroView isAuthenticated={false} />
        ) : creating ? (
          <ProvisionCreateView
            onBack={() => setCreating(false)}
            onCreated={() => { fetchProvisions(); fetchHistories(); }}
          />
        ) : detail ? (
          <InstanceDetail
            provision={detail}
            onBack={() => setDetail(null)}
            onDeleted={() => { setDetail(null); fetchProvisions(); }}
          />
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-700 mb-1">{tList.title}</h2>
                <p className="text-xs text-gray-500">{tList.description}</p>
              </div>
              <div className="flex items-center gap-2">
                {selected.size > 0 && (
                  <Button variant="destructive" size="sm" onClick={() => setConfirmTargets([...selected])}>
                    {tList.deleteSelected.replace("{count}", String(selected.size))}
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => { fetchProvisions(); if (tab === "history") fetchHistories(); }}>{tList.refresh}</Button>
                <Button variant="default" size="sm" onClick={() => setCreating(true)}>{tList.add}</Button>
              </div>
            </div>

            <div className="flex gap-1 mb-4 border-b">
              {([["active", tList.tabs.active, activeProvisions.length], ["history", tList.tabs.history, histories.length]] as const).map(([key, label, count]) => (
                <button key={key}
                  className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                    tab === key
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                  onClick={() => handleTabChange(key)}>
                  {label}
                  <span className="ml-1.5 text-xs text-gray-400">({count})</span>
                </button>
              ))}
            </div>

            {tab === "active" && (
              <>
                {loading && (
                  <div className="flex items-center justify-center py-12 gap-3">
                    <Spinner size="md" />
                    <span className="text-sm text-gray-600">{tList.loading}</span>
                  </div>
                )}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">{error}</div>
                )}
                {!loading && !error && (
                  <InstanceTable
                    provisions={activeProvisions}
                    selected={selected}
                    onSelectChange={setSelected}
                    onRowClick={setDetail}
                  />
                )}
              </>
            )}

            {tab === "history" && (
              <>
                {historyLoading && (
                  <div className="flex items-center justify-center py-12 gap-3">
                    <Spinner size="md" />
                    <span className="text-sm text-gray-600">{tList.loading}</span>
                  </div>
                )}
                {!historyLoading && <HistoryTable entries={histories} />}
              </>
            )}
          </>
        )}
      </main>

      <ConfirmModal
        open={confirmTargets.length > 0}
        title={tDetail.deleteConfirm.title}
        message={
          confirmTargets.length === 1
            ? tDetail.deleteConfirm.messageSingle.replace("{name}", confirmTargets[0])
            : tDetail.deleteConfirm.messageMulti.replace("{count}", String(confirmTargets.length))
        }
        confirmText={deleting ? tDetail.deleteConfirm.deleting : tDetail.deleteConfirm.confirm}
        cancelText={tDetail.deleteConfirm.cancel}
        onConfirm={handleBulkDelete}
        onCancel={() => setConfirmTargets([])}
      />
    </Layout>
  );
}
