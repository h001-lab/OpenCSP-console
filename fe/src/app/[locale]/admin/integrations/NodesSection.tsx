"use client";

import { useEffect, useState } from "react";
import { Button } from "@h001/ui";
import { NodesMessages } from "./types";
import { ChevronIcon } from "./common";

type NodeStatus = "ACTIVE" | "ISOLATED" | "MAINTENANCE" | "OFFLINE";
type NodeType = "PROXMOX" | "KVM" | "OPENSTACK";

interface NodeItem {
  id: number;
  uuid: string;
  hostname: string;
  ip: string;
  type: NodeType;
  status: NodeStatus;
  description: string | null;
  proxmoxNode: string | null;
  apiUrl: string | null;
  hasCredentials: boolean;
  cpuUsagePercent: number | null;
  cpuTotal: number | null;
  memUsedBytes: number | null;
  memTotalBytes: number | null;
  diskUsedBytes: number | null;
  diskTotalBytes: number | null;
  metricsUpdatedAt: string | null;
}

interface TestStepItem { name: string; success: boolean; message: string }
interface TestResultItem { success: boolean; steps: TestStepItem[] }

function MetricBar({ label, pct, detail }: { label: string; pct: number; detail: string }) {
  const color = pct > 90 ? "bg-red-500" : pct > 75 ? "bg-orange-400" : "bg-blue-400";
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-gray-400 w-8 shrink-0">{label}</span>
      <div className="w-20 bg-gray-100 rounded-full h-1.5">
        <div className={`${color} h-1.5 rounded-full`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className="text-xs text-gray-500 shrink-0">{detail}</span>
    </div>
  );
}

function fmtBytes(bytes: number | null): string {
  if (bytes == null) return "—";
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(0) + " MB";
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB";
}

function deriveApiUrl(ipOrUrl: string, type: NodeType): string {
  if (!ipOrUrl) return "";
  if (/^https?:\/\//.test(ipOrUrl)) return ipOrUrl;
  if (type === "PROXMOX") return `https://${ipOrUrl}:8006`;
  return `https://${ipOrUrl}`;
}

const NODE_TYPES: NodeType[] = ["PROXMOX", "KVM", "OPENSTACK"];
const STATUS_LABEL: Record<NodeStatus, string> = {
  ACTIVE: "Active",
  ISOLATED: "Isolated",
  MAINTENANCE: "Maintenance",
  OFFLINE: "Offline",
};

const STATUS_COLOR: Record<NodeStatus, string> = {
  ACTIVE: "bg-green-50 text-green-700 border-green-200",
  ISOLATED: "bg-orange-50 text-orange-700 border-orange-200",
  MAINTENANCE: "bg-yellow-50 text-yellow-700 border-yellow-200",
  OFFLINE: "bg-red-50 text-red-500 border-red-200",
};

interface NodesSectionProps { t: NodesMessages }

export function NodesSection({ t }: NodesSectionProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [nodes, setNodes] = useState<NodeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({
    hostname: "", ip: "", type: "PROXMOX" as NodeType, description: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const [credOpen, setCredOpen] = useState<string | null>(null);
  const [credForm, setCredForm] = useState<Record<string, { proxmoxNode: string; apiToken: string }>>({});
  const [savingCred, setSavingCred] = useState<string | null>(null);
  const [credMsg, setCredMsg] = useState<Record<string, { ok: boolean; msg: string } | undefined>>({});

  const [testingNode, setTestingNode] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, TestResultItem | undefined>>({});

  const [confirmDelete, setConfirmDelete] = useState<NodeItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmIsolate, setConfirmIsolate] = useState<NodeItem | null>(null);
  const [isolating, setIsolating] = useState(false);

  const [discovering, setDiscovering] = useState(false);
  const [discoveredNodes, setDiscoveredNodes] = useState<{ nodeName: string; clusterStatus: string }[] | null>(null);
  const [discoverError, setDiscoverError] = useState<string | null>(null);
  const [importingNodes, setImportingNodes] = useState<Set<string>>(new Set());
  const [importingAll, setImportingAll] = useState(false);

  useEffect(() => { fetchNodes(); }, []);

  async function fetchNodes() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/nodes");
      const json = await res.json();
      setNodes(json.data ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    setSubmitting(true);
    try {
      const apiUrl = deriveApiUrl(addForm.ip, addForm.type);
      const res = await fetch("/api/admin/nodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...addForm, apiUrl }),
      });
      if (!res.ok) { alert(t.form.registerFailed); return; }
      setShowAddForm(false);
      setAddForm({ hostname: "", ip: "", type: "PROXMOX", description: "" });
      await fetchNodes();
    } catch { alert(t.form.registerFailed); }
    finally { setSubmitting(false); }
  }

  async function handleDelete(node: NodeItem) {
    setDeleting(true);
    try {
      await fetch(`/api/admin/nodes/${node.uuid}`, { method: "DELETE" });
      setConfirmDelete(null);
      await fetchNodes();
    } finally { setDeleting(false); }
  }

  async function handleIsolate(node: NodeItem) {
    setIsolating(true);
    try {
      const newStatus: NodeStatus = node.status === "ACTIVE" ? "ISOLATED" : "ACTIVE";
      const res = await fetch(`/api/admin/nodes/${node.uuid}?status=${newStatus}`, { method: "PATCH" });
      if (!res.ok) { alert(t.statusChangeFailed); return; }
      setConfirmIsolate(null);
      await fetchNodes();
    } catch { alert(t.statusChangeFailed); }
    finally { setIsolating(false); }
  }

  async function handleDiscover() {
    setDiscovering(true);
    setDiscoverError(null);
    setDiscoveredNodes(null);
    try {
      const res = await fetch("/api/admin/nodes/discover");
      const json = await res.json();
      if (!res.ok) {
        const msg = json.error === "NO_SEED_NODE" ? t.detected.noSeedNode : (json.message ?? t.detected.importFailed);
        setDiscoverError(msg);
        return;
      }
      setDiscoveredNodes(json);
    } catch {
      setDiscoverError(t.detected.importFailed);
    } finally {
      setDiscovering(false);
    }
  }

  async function handleImport(nodeNames: string[]) {
    const isAll = nodeNames.length > 1;
    if (isAll) setImportingAll(true);
    else setImportingNodes(prev => new Set(prev).add(nodeNames[0]));

    try {
      const res = await fetch("/api/admin/nodes/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodeNames }),
      });
      if (!res.ok) { alert(t.detected.importFailed); return; }
      setDiscoveredNodes(prev => prev?.filter(n => !nodeNames.includes(n.nodeName)) ?? null);
      await fetchNodes();
    } catch { alert(t.detected.importFailed); }
    finally {
      if (isAll) setImportingAll(false);
      else setImportingNodes(prev => { const s = new Set(prev); s.delete(nodeNames[0]); return s; });
    }
  }

  function openCredPanel(node: NodeItem) {
    setCredOpen(node.uuid);
    setCredForm(prev => ({
      ...prev,
      [node.uuid]: { proxmoxNode: node.proxmoxNode ?? "", apiToken: "" },
    }));
    setCredMsg(prev => ({ ...prev, [node.uuid]: undefined }));
    setTestResults(prev => ({ ...prev, [node.uuid]: undefined }));
  }

  async function handleSaveCred(node: NodeItem) {
    setSavingCred(node.uuid);
    try {
      const apiUrl = deriveApiUrl(node.ip, node.type);
      const res = await fetch(`/api/admin/nodes/${node.uuid}/credentials`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...credForm[node.uuid], apiUrl }),
      });
      if (!res.ok) {
        setCredMsg(prev => ({ ...prev, [node.uuid]: { ok: false, msg: t.credentialsSaveFailed } }));
        return;
      }
      setCredMsg(prev => ({ ...prev, [node.uuid]: { ok: true, msg: t.credentialsSaved } }));
      setCredOpen(null);
      await fetchNodes();
    } catch {
      setCredMsg(prev => ({ ...prev, [node.uuid]: { ok: false, msg: t.credentialsSaveFailed } }));
    } finally {
      setSavingCred(null);
    }
  }

  async function handleTest(node: NodeItem) {
    setTestingNode(node.uuid);
    setTestResults(prev => ({ ...prev, [node.uuid]: undefined }));
    try {
      const apiUrl = deriveApiUrl(node.ip, node.type);
      const cred = credOpen === node.uuid && credForm[node.uuid];
      const body = cred ? { ...cred, apiUrl } : { apiUrl };
      const res = await fetch(`/api/admin/nodes/${node.uuid}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await res.json();
      setTestResults(prev => ({ ...prev, [node.uuid]: result }));
    } catch {
      setTestResults(prev => ({
        ...prev,
        [node.uuid]: { success: false, steps: [{ name: "Error", success: false, message: "Request failed" }] },
      }));
    } finally {
      setTestingNode(null);
    }
  }

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      {/* 헤더 */}
      <div
        className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between cursor-pointer select-none hover:bg-gray-100"
        onClick={() => setCollapsed(v => !v)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <ChevronIcon collapsed={collapsed} />
          <span className="text-sm font-semibold text-gray-900 shrink-0">{t.sectionTitle}</span>
          <span className="text-xs text-gray-500 truncate hidden sm:block">{t.description}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
          <Button variant="outline" size="sm" onClick={fetchNodes}>{t.refresh}</Button>
          <Button variant="outline" size="sm" onClick={() => { handleDiscover(); setCollapsed(false); }} disabled={discovering}>
            {discovering ? t.detecting : t.autoDetect}
          </Button>
          <Button variant="default" size="sm" onClick={() => { setShowAddForm(v => !v); setCollapsed(false); }}>{t.addNode}</Button>
        </div>
      </div>

      {!collapsed && (
        <div>
          {/* 자동 감지 오류 */}
          {discoverError && (
            <div className="border-b bg-red-50 px-4 py-3 flex items-center justify-between">
              <p className="text-xs text-red-700">{discoverError}</p>
              <button className="text-xs text-gray-400 hover:text-gray-600 ml-4" onClick={() => setDiscoverError(null)}>✕</button>
            </div>
          )}

          {/* 감지된 노드 패널 */}
          {discoveredNodes !== null && (
            <div className="border-b bg-blue-50/30 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold text-gray-700">{t.detected.title}</p>
                  {discoveredNodes.length > 0 && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                      {discoveredNodes.length}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {discoveredNodes.length > 1 && (
                    <button
                      className="text-xs px-2.5 py-1 rounded border font-medium text-white disabled:opacity-50"
                      style={{ backgroundColor: "#2563eb", borderColor: "#1d4ed8" }}
                      onClick={() => handleImport(discoveredNodes.map(n => n.nodeName))}
                      disabled={importingAll}
                    >
                      {importingAll ? t.detected.importing : t.detected.importAll}
                    </button>
                  )}
                  <button className="text-xs text-gray-400 hover:text-gray-600" onClick={() => setDiscoveredNodes(null)}>✕</button>
                </div>
              </div>

              {discoveredNodes.length === 0 ? (
                <p className="text-xs text-gray-500">{t.detected.noNew}</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {discoveredNodes.map(n => (
                    <div key={n.nodeName} className="flex items-center justify-between bg-white rounded border px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-semibold text-gray-800">{n.nodeName}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${
                          n.clusterStatus === "online"
                            ? "bg-green-50 text-green-700 border-green-200"
                            : "bg-gray-100 text-gray-500 border-gray-200"
                        }`}>
                          {n.clusterStatus}
                        </span>
                      </div>
                      <button
                        className="text-xs px-2.5 py-1 rounded border font-medium disabled:opacity-50 transition-colors"
                        style={{ color: "#2563eb", borderColor: "#bfdbfe", backgroundColor: "#eff6ff" }}
                        onClick={() => handleImport([n.nodeName])}
                        disabled={importingNodes.has(n.nodeName) || importingAll}
                      >
                        {importingNodes.has(n.nodeName) ? t.detected.importing : t.detected.importBtn}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 노드 추가 폼 */}
          {showAddForm && (
            <div className="border-b bg-blue-50/30 p-4">
              <p className="text-xs font-semibold text-gray-700 mb-3">{t.form.title}</p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-xs text-gray-600 block mb-1">{t.form.hostname.label} *</label>
                  <input className="w-full border rounded px-2 py-1.5 text-xs"
                    placeholder={t.form.hostname.placeholder}
                    value={addForm.hostname}
                    onChange={e => setAddForm(p => ({ ...p, hostname: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-gray-600 block mb-1">{t.form.ip.label} *</label>
                  <input className="w-full border rounded px-2 py-1.5 text-xs font-mono"
                    placeholder={t.form.ip.placeholder}
                    value={addForm.ip}
                    onChange={e => setAddForm(p => ({ ...p, ip: e.target.value }))} />
                  {addForm.ip && (
                    <p className="text-xs text-gray-400 mt-0.5 font-mono truncate">
                      → {deriveApiUrl(addForm.ip, addForm.type)}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-xs text-gray-600 block mb-1">{t.form.type}</label>
                  <div className="flex rounded border overflow-hidden">
                    {NODE_TYPES.map(v => (
                      <button
                        key={v}
                        type="button"
                        className={`flex-1 text-xs py-1.5 border-r last:border-r-0 transition-colors ${
                          addForm.type === v
                            ? "bg-blue-600 text-white font-medium"
                            : "bg-white text-gray-600 hover:bg-gray-50"
                        }`}
                        onClick={() => setAddForm(p => ({ ...p, type: v }))}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-600 block mb-1">{t.form.description.label}</label>
                  <input className="w-full border rounded px-2 py-1.5 text-xs"
                    placeholder={t.form.description.placeholder}
                    value={addForm.description}
                    onChange={e => setAddForm(p => ({ ...p, description: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  className="text-xs px-3 py-1.5 rounded border font-medium text-white disabled:opacity-50 transition-colors"
                  style={{ backgroundColor: "#2563eb", borderColor: "#1d4ed8" }}
                  onClick={handleAdd}
                  disabled={submitting || !addForm.hostname || !addForm.ip}>
                  {submitting ? t.form.submitting : t.form.submit}
                </button>
                <button className="text-xs text-gray-500 hover:text-gray-700"
                  onClick={() => setShowAddForm(false)}>
                  {t.cancelCredentials}
                </button>
              </div>
            </div>
          )}

          {/* 노드 목록 */}
          {loading ? (
            <div className="py-8 text-center text-sm text-gray-400">{t.loading}</div>
          ) : nodes.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">{t.empty}</div>
          ) : (
            <>
              {/* 헤더 */}
              <div className="px-4 py-2 flex items-center gap-3 border-b bg-gray-50 text-xs font-medium text-gray-500">
                <div className="w-48 shrink-0">Hostname / IP</div>
                <div className="w-20 shrink-0">Type</div>
                <div className="w-20 shrink-0">Status</div>
                <div className="w-24 shrink-0">API</div>
                <div className="flex-1">Metrics</div>
                <div className="w-48 shrink-0">Functions</div>
              </div>

            {nodes.map(node => {
              const isCredOpen = credOpen === node.uuid;
              const cred = credForm[node.uuid];
              const testResult = testResults[node.uuid];
              const cm = credMsg[node.uuid];
              const isTesting = testingNode === node.uuid;
              const isSavingCred = savingCred === node.uuid;

              const cpuPct = node.cpuUsagePercent;
              const memPct = node.memTotalBytes ? (node.memUsedBytes! / node.memTotalBytes) * 100 : null;
              const diskPct = node.diskTotalBytes ? (node.diskUsedBytes! / node.diskTotalBytes) * 100 : null;
              const hasMetrics = node.metricsUpdatedAt && cpuPct != null;
              const canTest = node.hasCredentials || (isCredOpen && !!cred?.apiToken);

              return (
                <div key={node.uuid} className="border-b last:border-b-0">
                  {/* 노드 행 */}
                  <div className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50/30">
                    <div className="w-48 shrink-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">{node.hostname}</p>
                      <p className="text-[10px] text-gray-400 font-mono truncate">{node.ip}</p>
                    </div>

                    <div className="w-20 shrink-0">
                      <span className="text-xs text-gray-500">{node.type}</span>
                    </div>

                    <div className="w-20 shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded border font-medium ${STATUS_COLOR[node.status] ?? "bg-gray-100 text-gray-500 border-gray-200"}`}>
                        {STATUS_LABEL[node.status] ?? node.status}
                      </span>
                    </div>

                    <div className="w-24 shrink-0">
                      {node.hasCredentials ? (
                        <span className="text-xs px-1.5 py-0.5 rounded border bg-green-50 text-green-700 border-green-200">
                          {t.apiStatus.connected}
                        </span>
                      ) : (
                        <span className="text-xs px-1.5 py-0.5 rounded border bg-gray-100 text-gray-400 border-gray-200">
                          {t.apiStatus.noCredentials}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      {hasMetrics ? (
                        <div className="flex flex-col gap-1">
                          <MetricBar label="CPU" pct={cpuPct!}
                            detail={`${cpuPct!.toFixed(1)}% / ${node.cpuTotal}c`} />
                          {memPct != null && (
                            <MetricBar label="Mem" pct={memPct}
                              detail={`${fmtBytes(node.memUsedBytes)} / ${fmtBytes(node.memTotalBytes)}`} />
                          )}
                          {diskPct != null && (
                            <MetricBar label="Disk" pct={diskPct}
                              detail={`${fmtBytes(node.diskUsedBytes)} / ${fmtBytes(node.diskTotalBytes)}`} />
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </div>

                    {/* function buttons */}
                    <div className="flex items-center gap-1.5 w-48 shrink-0">
                      <button
                        className="text-xs px-2 py-0.5 rounded border font-medium transition-colors"
                        style={isCredOpen
                          ? { color: "#374151", borderColor: "#d1d5db", backgroundColor: "#f3f4f6" }
                          : { color: "#2563eb", borderColor: "#bfdbfe", backgroundColor: "#eff6ff" }}
                        onClick={() => isCredOpen ? setCredOpen(null) : openCredPanel(node)}
                      >
                        {t.editCredentials}
                      </button>
                      <button
                        className="text-xs px-2 py-0.5 rounded border font-medium transition-colors"
                        style={node.status === "ACTIVE"
                          ? { color: "#c2410c", borderColor: "#fed7aa", backgroundColor: "#fff7ed" }
                          : { color: "#1d4ed8", borderColor: "#bfdbfe", backgroundColor: "#eff6ff" }}
                        onClick={() => setConfirmIsolate(node)}
                      >
                        {node.status === "ACTIVE" ? t.isolateBtn : t.restoreBtn}
                      </button>
                      <button
                        className="text-xs px-2 py-0.5 rounded border font-medium transition-colors"
                        style={{ color: "#dc2626", borderColor: "#fecaca", backgroundColor: "#fff1f2" }}
                        onClick={() => setConfirmDelete(node)}
                      >
                        {t.delete}
                      </button>
                    </div>
                  </div>

                  {/* 크레덴셜 편집 패널 */}
                  {isCredOpen && cred && (
                    <div className="px-4 py-4 bg-gray-50 border-t">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold text-gray-700">{t.credentialsTitle}</p>
                        <span className="text-[10px] text-gray-400 font-mono">
                          {t.derivedApiUrlLabel}: {deriveApiUrl(node.ip, node.type) || "—"}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">{t.credentials.proxmoxNode.label}</label>
                          <input
                            className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs font-mono bg-white focus:outline-none focus:ring-1 focus:ring-blue-300"
                            placeholder={t.credentials.proxmoxNode.placeholder}
                            value={cred.proxmoxNode}
                            onChange={e => setCredForm(p => ({ ...p, [node.uuid]: { ...p[node.uuid], proxmoxNode: e.target.value } }))} />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">{t.credentials.apiToken.label}</label>
                          <input
                            type="password"
                            className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs font-mono bg-white focus:outline-none focus:ring-1 focus:ring-blue-300"
                            placeholder={t.credentials.apiToken.placeholder}
                            value={cred.apiToken}
                            onChange={e => setCredForm(p => ({ ...p, [node.uuid]: { ...p[node.uuid], apiToken: e.target.value } }))} />
                        </div>
                      </div>

                      {testResult && (
                        <div className={`rounded-md p-2.5 text-xs mb-3 border ${testResult.success
                          ? "bg-green-50 border-green-200"
                          : "bg-red-50 border-red-200"}`}>
                          <p className={`font-semibold mb-1 ${testResult.success ? "text-green-800" : "text-red-800"}`}>
                            {testResult.success ? `✓ ${t.testPassed}` : `✗ ${t.testFailed}`}
                          </p>
                          {testResult.steps.map((step, i) => (
                            <p key={i} className={`leading-relaxed ${step.success ? "text-green-700" : "text-red-700"}`}>
                              {step.success ? "✓" : "✗"} <span className="font-medium">{step.name}:</span> {step.message}
                            </p>
                          ))}
                        </div>
                      )}

                      {cm && (
                        <p className={`text-xs mb-3 ${cm.ok ? "text-green-700" : "text-red-600"}`}>
                          {cm.ok ? `✓ ${cm.msg}` : `✗ ${cm.msg}`}
                        </p>
                      )}

                      {/* test, save, cancel */}
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          className="text-xs px-2.5 py-1.5 rounded border font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          style={cred.apiToken
                            ? { color: "#374151", borderColor: "#d1d5db", backgroundColor: "#ffffff" }
                            : { color: "#9ca3af", borderColor: "#e5e7eb", backgroundColor: "#f9fafb" }}
                          onClick={() => handleTest(node)}
                          disabled={isTesting || !cred.apiToken}
                        >
                          {isTesting ? t.testing : t.testBtn}
                        </button>
                        <button
                          className="text-xs px-2.5 py-1.5 rounded border font-medium transition-colors text-white disabled:opacity-50"
                          style={{ backgroundColor: "#2563eb", borderColor: "#1d4ed8" }}
                          onClick={() => handleSaveCred(node)}
                          disabled={isSavingCred}
                        >
                          {isSavingCred ? t.savingCredentials : t.saveCredentials}
                        </button>
                        <button
                          className="text-xs px-2.5 py-1.5 rounded border font-medium transition-colors"
                          style={{ color: "#6b7280", borderColor: "#e5e7eb", backgroundColor: "#ffffff" }}
                          onClick={() => setCredOpen(null)}
                        >
                          {t.cancelCredentials}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            </>
          )}
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border p-5 w-80 shadow-lg">
            <p className="text-sm font-semibold mb-2">{t.confirm.delete.title}</p>
            <p className="text-xs text-gray-600 mb-4">
              {t.confirm.delete.message.replace("{hostname}", confirmDelete.hostname)}
            </p>
            <div className="flex gap-2 justify-end">
              <button
                className="text-xs text-gray-500 px-3 py-1.5 border rounded hover:bg-gray-50"
                onClick={() => setConfirmDelete(null)}
              >
                {t.confirm.delete.cancel}
              </button>
              <button
                className="text-xs bg-red-600 text-white px-3 py-1.5 rounded hover:bg-red-700 disabled:opacity-50"
                onClick={() => handleDelete(confirmDelete)}
                disabled={deleting}
              >
                {deleting ? t.confirm.delete.deleting : t.confirm.delete.confirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 격리/복구 확인 모달 */}
      {confirmIsolate && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border p-5 w-80 shadow-lg">
            <p className="text-sm font-semibold mb-2">
              {confirmIsolate.status === "ACTIVE" ? t.confirm.isolate.title : t.confirm.restore.title}
            </p>
            <p className="text-xs text-gray-600 mb-4">
              {(confirmIsolate.status === "ACTIVE" ? t.confirm.isolate.message : t.confirm.restore.message)
                .replace("{hostname}", confirmIsolate.hostname)}
            </p>
            <div className="flex gap-2 justify-end">
              <button
                className="text-xs text-gray-500 px-3 py-1.5 border rounded hover:bg-gray-50"
                onClick={() => setConfirmIsolate(null)}
              >
                {confirmIsolate.status === "ACTIVE" ? t.confirm.isolate.cancel : t.confirm.restore.cancel}
              </button>
              <button
                className="text-xs text-white px-3 py-1.5 rounded disabled:opacity-50"
                style={{ backgroundColor: confirmIsolate.status === "ACTIVE" ? "#f97316" : "#2563eb" }}
                onClick={() => handleIsolate(confirmIsolate)}
                disabled={isolating}
              >
                {isolating
                  ? (confirmIsolate.status === "ACTIVE" ? t.confirm.isolate.isolating : t.confirm.restore.restoring)
                  : (confirmIsolate.status === "ACTIVE" ? t.confirm.isolate.confirm : t.confirm.restore.confirm)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
