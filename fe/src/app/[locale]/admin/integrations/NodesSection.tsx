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

type MetricLevel = "normal" | "warning" | "critical";
const METRIC_VALUE_COLOR: Record<MetricLevel, string> = {
  normal:   "var(--fg-primary)",
  warning:  "var(--warn-600)",
  critical: "var(--danger-600)",
};
function metricLevel(pct: number): MetricLevel {
  if (pct > 90) return "critical";
  if (pct > 75) return "warning";
  return "normal";
}

function MetricItem({ label, value, pct }: { label: string; value: string; pct?: number }) {
  const level = pct != null ? metricLevel(pct) : "normal";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <span style={{ fontSize: "10px", color: "var(--fg-disabled)", width: 28, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: "11px", color: METRIC_VALUE_COLOR[level], fontFamily: "var(--font-mono)" }}>{value}</span>
    </div>
  );
}

function fmtBytes(bytes: number | null): string {
  if (bytes == null) return "—";
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(0) + " MB";
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB";
}

function fmtRelativeTime(iso: string | null): string {
  if (!iso) return "";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
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

const STATUS_STYLES: Record<NodeStatus, React.CSSProperties> = {
  ACTIVE:      { background: "var(--ok-50)",      color: "var(--ok-600)",      border: "1px solid var(--ok-50)" },
  ISOLATED:    { background: "var(--warn-50)",     color: "var(--warn-600)",    border: "1px solid var(--warn-50)" },
  MAINTENANCE: { background: "var(--warn-50)",     color: "var(--warn-600)",    border: "1px solid var(--warn-50)" },
  OFFLINE:     { background: "var(--neutral-50)",  color: "var(--neutral-600)", border: "1px solid var(--neutral-50)" },
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid var(--border-1)",
  borderRadius: "var(--r-xs)",
  padding: "5px 10px",
  fontSize: "12px",
  fontFamily: "var(--font-mono)",
  background: "var(--bg-surface)",
  color: "var(--fg-primary)",
  outline: "none",
  boxSizing: "border-box",
};

const modalOverlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.3)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 50,
};

const modalCardStyle: React.CSSProperties = {
  background: "var(--bg-surface)",
  border: "1px solid var(--border-1)",
  borderRadius: "var(--r-md)",
  padding: 20,
  width: 320,
  boxShadow: "var(--shadow-card)",
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
      if (result.success) await fetchNodes();
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
    <div style={{
      background: "var(--bg-surface)",
      border: "1px solid var(--border-1)",
      borderRadius: "var(--r-md)",
      overflow: "hidden",
    }}>
      {/* 헤더 */}
      <div
        style={{
          padding: "10px 16px",
          borderBottom: collapsed ? "none" : "1px solid var(--border-1)",
          background: "var(--bg-subtle)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          userSelect: "none",
        }}
        onClick={() => setCollapsed(v => !v)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <ChevronIcon collapsed={collapsed} />
          <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--fg-primary)", flexShrink: 0 }}>{t.sectionTitle}</span>
          <span style={{ fontSize: "11px", color: "var(--fg-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.description}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
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
            <div style={{
              borderBottom: "1px solid var(--border-1)",
              background: "var(--danger-50)",
              padding: "10px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}>
              <p style={{ fontSize: "12px", color: "var(--danger-600)", margin: 0 }}>{discoverError}</p>
              <button
                style={{ fontSize: "12px", color: "var(--fg-disabled)", background: "none", border: "none", cursor: "pointer", marginLeft: 16 }}
                onClick={() => setDiscoverError(null)}
              >✕</button>
            </div>
          )}

          {/* 감지된 노드 패널 */}
          {discoveredNodes !== null && (
            <div style={{
              borderBottom: "1px solid var(--border-1)",
              background: "var(--info-50)",
              padding: 16,
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--fg-primary)", margin: 0 }}>{t.detected.title}</p>
                  {discoveredNodes.length > 0 && (
                    <span style={{
                      fontSize: "11px",
                      padding: "1px 6px",
                      borderRadius: 999,
                      background: "var(--brand-100)",
                      color: "var(--brand-600)",
                      fontWeight: 600,
                    }}>
                      {discoveredNodes.length}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {discoveredNodes.length > 1 && (
                    <button
                      style={{
                        fontSize: "12px",
                        padding: "4px 10px",
                        borderRadius: "var(--r-xs)",
                        border: "1px solid var(--brand-600)",
                        background: "var(--brand-600)",
                        color: "#fff",
                        fontWeight: 500,
                        cursor: "pointer",
                        opacity: importingAll ? 0.5 : 1,
                      }}
                      onClick={() => handleImport(discoveredNodes.map(n => n.nodeName))}
                      disabled={importingAll}
                    >
                      {importingAll ? t.detected.importing : t.detected.importAll}
                    </button>
                  )}
                  <button
                    style={{ fontSize: "12px", color: "var(--fg-muted)", background: "none", border: "none", cursor: "pointer" }}
                    onClick={() => setDiscoveredNodes(null)}
                  >✕</button>
                </div>
              </div>

              {discoveredNodes.length === 0 ? (
                <p style={{ fontSize: "12px", color: "var(--fg-muted)", margin: 0 }}>{t.detected.noNew}</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {discoveredNodes.map(n => (
                    <div key={n.nodeName} style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border-1)",
                      borderRadius: "var(--r-sm)",
                      padding: "6px 12px",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: "12px", fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--fg-primary)" }}>{n.nodeName}</span>
                        <span style={{
                          fontSize: "10px",
                          padding: "1px 6px",
                          borderRadius: "var(--r-xs)",
                          fontWeight: 500,
                          ...(n.clusterStatus === "online"
                            ? { background: "var(--ok-50)", color: "var(--ok-600)", border: "1px solid var(--ok-50)" }
                            : { background: "var(--bg-subtle)", color: "var(--fg-muted)", border: "1px solid var(--border-1)" }),
                        }}>
                          {n.clusterStatus}
                        </span>
                      </div>
                      <button
                        style={{
                          fontSize: "12px",
                          padding: "3px 10px",
                          borderRadius: "var(--r-xs)",
                          border: "1px solid var(--brand-100)",
                          background: "var(--info-50)",
                          color: "var(--brand-600)",
                          fontWeight: 500,
                          cursor: "pointer",
                          opacity: (importingNodes.has(n.nodeName) || importingAll) ? 0.5 : 1,
                          transition: "opacity 150ms",
                        }}
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
            <div style={{
              borderBottom: "1px solid var(--border-1)",
              background: "var(--info-50)",
              padding: 16,
            }}>
              <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--fg-primary)", marginBottom: 12 }}>{t.form.title}</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: "11px", color: "var(--fg-muted)", display: "block", marginBottom: 4 }}>{t.form.hostname.label} *</label>
                  <input
                    style={inputStyle}
                    placeholder={t.form.hostname.placeholder}
                    value={addForm.hostname}
                    onChange={e => setAddForm(p => ({ ...p, hostname: e.target.value }))}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "11px", color: "var(--fg-muted)", display: "block", marginBottom: 4 }}>{t.form.ip.label} *</label>
                  <input
                    style={inputStyle}
                    placeholder={t.form.ip.placeholder}
                    value={addForm.ip}
                    onChange={e => setAddForm(p => ({ ...p, ip: e.target.value }))}
                  />
                  {addForm.ip && (
                    <p style={{ fontSize: "11px", color: "var(--fg-disabled)", marginTop: 2, fontFamily: "var(--font-mono)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      → {deriveApiUrl(addForm.ip, addForm.type)}
                    </p>
                  )}
                </div>
                <div>
                  <label style={{ fontSize: "11px", color: "var(--fg-muted)", display: "block", marginBottom: 4 }}>{t.form.type}</label>
                  <div style={{ display: "flex", border: "1px solid var(--border-1)", borderRadius: "var(--r-xs)", overflow: "hidden" }}>
                    {NODE_TYPES.map(v => (
                      <button
                        key={v}
                        type="button"
                        style={{
                          flex: 1,
                          fontSize: "11px",
                          padding: "5px 0",
                          borderRight: "1px solid var(--border-1)",
                          cursor: "pointer",
                          transition: "background 150ms, color 150ms",
                          ...(addForm.type === v
                            ? { background: "var(--brand-600)", color: "#fff", fontWeight: 500, border: "none" }
                            : { background: "var(--bg-surface)", color: "var(--fg-secondary)", border: "none", borderRight: "1px solid var(--border-1)" }),
                        }}
                        onClick={() => setAddForm(p => ({ ...p, type: v }))}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: "11px", color: "var(--fg-muted)", display: "block", marginBottom: 4 }}>{t.form.description.label}</label>
                  <input
                    style={inputStyle}
                    placeholder={t.form.description.placeholder}
                    value={addForm.description}
                    onChange={e => setAddForm(p => ({ ...p, description: e.target.value }))}
                  />
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  style={{
                    fontSize: "12px",
                    padding: "5px 12px",
                    borderRadius: "var(--r-xs)",
                    border: "1px solid var(--brand-600)",
                    background: "var(--brand-600)",
                    color: "#fff",
                    fontWeight: 500,
                    cursor: "pointer",
                    opacity: (submitting || !addForm.hostname || !addForm.ip) ? 0.5 : 1,
                  }}
                  onClick={handleAdd}
                  disabled={submitting || !addForm.hostname || !addForm.ip}
                >
                  {submitting ? t.form.submitting : t.form.submit}
                </button>
                <button
                  style={{ fontSize: "12px", color: "var(--fg-muted)", background: "none", border: "none", cursor: "pointer" }}
                  onClick={() => setShowAddForm(false)}
                >
                  {t.cancelCredentials}
                </button>
              </div>
            </div>
          )}

          {/* 노드 목록 */}
          {loading ? (
            <div style={{ padding: "32px 16px", textAlign: "center", fontSize: "13px", color: "var(--fg-muted)" }}>{t.loading}</div>
          ) : nodes.length === 0 ? (
            <div style={{ padding: "32px 16px", textAlign: "center", fontSize: "13px", color: "var(--fg-muted)" }}>{t.empty}</div>
          ) : (
            <>
              {/* 헤더 행 */}
              <div style={{
                padding: "6px 16px",
                display: "flex",
                alignItems: "center",
                gap: 12,
                borderBottom: "1px solid var(--border-1)",
                background: "var(--bg-subtle)",
                fontSize: "11px",
                fontWeight: 500,
                color: "var(--fg-muted)",
              }}>
                <div style={{ width: 192, flexShrink: 0 }}>Hostname/ IP</div>
                <div style={{ width: 80, flexShrink: 0 }}>Type</div>
                <div style={{ width: 80, flexShrink: 0 }}>Node Status</div>
                <div style={{ width: 96, flexShrink: 0 }}>API Connection</div>
                <div style={{ flex: 1 }}>Metrics</div>
                <div style={{ width: 192, flexShrink: 0 }}>Functions</div>
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

                return (
                  <div key={node.uuid} style={{ borderBottom: "1px solid var(--border-1)" }}>
                    {/* 노드 행 */}
                    <div style={{ padding: "10px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 192, flexShrink: 0, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: "12px", fontWeight: 600, color: "var(--fg-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{node.hostname}</p>
                        <p style={{ margin: 0, fontSize: "10px", color: "var(--fg-disabled)", fontFamily: "var(--font-mono)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{node.ip}</p>
                      </div>

                      <div style={{ width: 80, flexShrink: 0 }}>
                        <span style={{ fontSize: "11px", color: "var(--fg-muted)" }}>{node.type}</span>
                      </div>

                      <div style={{ width: 80, flexShrink: 0 }}>
                        <span style={{
                          fontSize: "11px",
                          padding: "2px 6px",
                          borderRadius: "var(--r-xs)",
                          fontWeight: 500,
                          ...STATUS_STYLES[node.status],
                        }}>
                          {STATUS_LABEL[node.status] ?? node.status}
                        </span>
                      </div>

                      <div style={{ width: 96, flexShrink: 0 }}>
                        {node.hasCredentials ? (
                          <span style={{
                            fontSize: "11px",
                            padding: "2px 6px",
                            borderRadius: "var(--r-xs)",
                            background: "var(--ok-50)",
                            color: "var(--ok-600)",
                            border: "1px solid var(--ok-50)",
                          }}>
                            {t.apiStatus.connected}
                          </span>
                        ) : (
                          <span style={{
                            fontSize: "11px",
                            padding: "2px 6px",
                            borderRadius: "var(--r-xs)",
                            background: "var(--bg-subtle)",
                            color: "var(--fg-disabled)",
                            border: "1px solid var(--border-1)",
                          }}>
                            {t.apiStatus.noCredentials}
                          </span>
                        )}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        {hasMetrics ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                            <MetricItem label="CPU" value={`${cpuPct!.toFixed(1)}% / ${node.cpuTotal}c`} pct={cpuPct!} />
                            {node.memTotalBytes != null && (
                              <MetricItem label="RAM" value={`${fmtBytes(node.memUsedBytes)} / ${fmtBytes(node.memTotalBytes)}`} pct={memPct ?? undefined} />
                            )}
                            {node.diskTotalBytes != null && (
                              <MetricItem label="Disk" value={`${fmtBytes(node.diskUsedBytes)} / ${fmtBytes(node.diskTotalBytes)}`} pct={diskPct ?? undefined} />
                            )}
                            <span style={{ fontSize: "9px", color: "var(--fg-disabled)", marginTop: 1 }}>
                              {fmtRelativeTime(node.metricsUpdatedAt)}
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontSize: "12px", color: "var(--fg-disabled)" }}>
                            {node.hasCredentials ? "polling…" : "—"}
                          </span>
                        )}
                      </div>

                      {/* 기능 버튼 */}
                      <div style={{ display: "flex", alignItems: "center", gap: 6, width: 192, flexShrink: 0 }}>
                        <button
                          style={{
                            fontSize: "11px",
                            padding: "3px 8px",
                            borderRadius: "var(--r-xs)",
                            cursor: "pointer",
                            fontWeight: 500,
                            ...(isCredOpen
                              ? { border: "1px solid var(--border-1)", background: "var(--bg-subtle)", color: "var(--fg-secondary)" }
                              : { border: "1px solid var(--brand-100)", background: "var(--info-50)", color: "var(--brand-600)" }),
                          }}
                          onClick={() => isCredOpen ? setCredOpen(null) : openCredPanel(node)}
                        >
                          {t.editCredentials}
                        </button>
                        <button
                          style={{
                            fontSize: "11px",
                            padding: "3px 8px",
                            borderRadius: "var(--r-xs)",
                            cursor: "pointer",
                            fontWeight: 500,
                            ...(node.status === "ACTIVE"
                              ? { border: "1px solid var(--warn-50)", background: "var(--warn-50)", color: "var(--warn-600)" }
                              : { border: "1px solid var(--brand-100)", background: "var(--info-50)", color: "var(--brand-600)" }),
                          }}
                          onClick={() => setConfirmIsolate(node)}
                        >
                          {node.status === "ACTIVE" ? t.isolateBtn : t.restoreBtn}
                        </button>
                        <button
                          style={{
                            fontSize: "11px",
                            padding: "3px 8px",
                            borderRadius: "var(--r-xs)",
                            cursor: "pointer",
                            fontWeight: 500,
                            border: "1px solid var(--danger-50)",
                            background: "var(--danger-50)",
                            color: "var(--danger-600)",
                          }}
                          onClick={() => setConfirmDelete(node)}
                        >
                          {t.delete}
                        </button>
                      </div>
                    </div>

                    {/* 크레덴셜 편집 패널 */}
                    {isCredOpen && cred && (
                      <div style={{ padding: 16, background: "var(--bg-subtle)", borderTop: "1px solid var(--border-1)" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                          <p style={{ margin: 0, fontSize: "12px", fontWeight: 600, color: "var(--fg-primary)" }}>{t.credentialsTitle}</p>
                          <span style={{ fontSize: "10px", color: "var(--fg-disabled)", fontFamily: "var(--font-mono)" }}>
                            {t.derivedApiUrlLabel}: {deriveApiUrl(node.ip, node.type) || "—"}
                          </span>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                          <div>
                            <label style={{ fontSize: "11px", color: "var(--fg-muted)", display: "block", marginBottom: 4 }}>{t.credentials.proxmoxNode.label}</label>
                            <input
                              style={inputStyle}
                              placeholder={t.credentials.proxmoxNode.placeholder}
                              value={cred.proxmoxNode}
                              onChange={e => setCredForm(p => ({ ...p, [node.uuid]: { ...p[node.uuid], proxmoxNode: e.target.value } }))}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: "11px", color: "var(--fg-muted)", display: "block", marginBottom: 4 }}>{t.credentials.apiToken.label}</label>
                            <input
                              type="password"
                              style={inputStyle}
                              placeholder={t.credentials.apiToken.placeholder}
                              value={cred.apiToken}
                              onChange={e => setCredForm(p => ({ ...p, [node.uuid]: { ...p[node.uuid], apiToken: e.target.value } }))}
                            />
                          </div>
                        </div>

                        {testResult && (
                          <div style={{
                            borderRadius: "var(--r-sm)",
                            padding: "10px 12px",
                            marginBottom: 12,
                            fontSize: "12px",
                            background: testResult.success ? "var(--ok-50)" : "var(--danger-50)",
                            border: `1px solid ${testResult.success ? "var(--ok-50)" : "var(--danger-50)"}`,
                          }}>
                            <p style={{ fontWeight: 600, marginBottom: 4, color: testResult.success ? "var(--ok-600)" : "var(--danger-600)" }}>
                              {testResult.success ? `✓ ${t.testPassed}` : `✗ ${t.testFailed}`}
                            </p>
                            {testResult.steps.map((step, i) => (
                              <p key={i} style={{ margin: "2px 0", color: step.success ? "var(--ok-600)" : "var(--danger-600)" }}>
                                {step.success ? "✓" : "✗"} <span style={{ fontWeight: 500 }}>{step.name}:</span> {step.message}
                              </p>
                            ))}
                          </div>
                        )}

                        {cm && (
                          <p style={{ fontSize: "12px", marginBottom: 12, color: cm.ok ? "var(--ok-600)" : "var(--danger-600)" }}>
                            {cm.ok ? `✓ ${cm.msg}` : `✗ ${cm.msg}`}
                          </p>
                        )}

                        <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                          <button
                            style={{
                              fontSize: "12px",
                              padding: "5px 12px",
                              borderRadius: "var(--r-xs)",
                              cursor: "pointer",
                              border: "1px solid var(--border-1)",
                              background: "var(--bg-surface)",
                              color: cred.apiToken ? "var(--fg-primary)" : "var(--fg-disabled)",
                              opacity: (isTesting || !cred.apiToken) ? 0.5 : 1,
                            }}
                            onClick={() => handleTest(node)}
                            disabled={isTesting || !cred.apiToken}
                          >
                            {isTesting ? t.testing : t.testBtn}
                          </button>
                          <button
                            style={{
                              fontSize: "12px",
                              padding: "5px 12px",
                              borderRadius: "var(--r-xs)",
                              border: "1px solid var(--brand-600)",
                              background: "var(--brand-600)",
                              color: "#fff",
                              fontWeight: 500,
                              cursor: "pointer",
                              opacity: isSavingCred ? 0.5 : 1,
                            }}
                            onClick={() => handleSaveCred(node)}
                            disabled={isSavingCred}
                          >
                            {isSavingCred ? t.savingCredentials : t.saveCredentials}
                          </button>
                          <button
                            style={{
                              fontSize: "12px",
                              padding: "5px 12px",
                              borderRadius: "var(--r-xs)",
                              border: "1px solid var(--border-1)",
                              background: "var(--bg-surface)",
                              color: "var(--fg-muted)",
                              cursor: "pointer",
                            }}
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
        <div style={modalOverlayStyle}>
          <div style={modalCardStyle}>
            <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--fg-primary)", marginBottom: 8 }}>{t.confirm.delete.title}</p>
            <p style={{ fontSize: "12px", color: "var(--fg-muted)", marginBottom: 16 }}>
              {t.confirm.delete.message.replace("{hostname}", confirmDelete.hostname)}
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                style={{ fontSize: "12px", color: "var(--fg-muted)", padding: "5px 12px", border: "1px solid var(--border-1)", borderRadius: "var(--r-xs)", background: "var(--bg-surface)", cursor: "pointer" }}
                onClick={() => setConfirmDelete(null)}
              >
                {t.confirm.delete.cancel}
              </button>
              <button
                style={{ fontSize: "12px", background: "var(--danger-600)", color: "#fff", padding: "5px 12px", border: "none", borderRadius: "var(--r-xs)", cursor: "pointer", opacity: deleting ? 0.5 : 1 }}
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
        <div style={modalOverlayStyle}>
          <div style={modalCardStyle}>
            <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--fg-primary)", marginBottom: 8 }}>
              {confirmIsolate.status === "ACTIVE" ? t.confirm.isolate.title : t.confirm.restore.title}
            </p>
            <p style={{ fontSize: "12px", color: "var(--fg-muted)", marginBottom: 16 }}>
              {(confirmIsolate.status === "ACTIVE" ? t.confirm.isolate.message : t.confirm.restore.message)
                .replace("{hostname}", confirmIsolate.hostname)}
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                style={{ fontSize: "12px", color: "var(--fg-muted)", padding: "5px 12px", border: "1px solid var(--border-1)", borderRadius: "var(--r-xs)", background: "var(--bg-surface)", cursor: "pointer" }}
                onClick={() => setConfirmIsolate(null)}
              >
                {confirmIsolate.status === "ACTIVE" ? t.confirm.isolate.cancel : t.confirm.restore.cancel}
              </button>
              <button
                style={{
                  fontSize: "12px",
                  color: "#fff",
                  padding: "5px 12px",
                  border: "none",
                  borderRadius: "var(--r-xs)",
                  cursor: "pointer",
                  opacity: isolating ? 0.5 : 1,
                  background: confirmIsolate.status === "ACTIVE" ? "var(--warn-600)" : "var(--brand-600)",
                }}
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
