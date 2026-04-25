"use client";

import { useEffect, useState } from "react";
import Layout from "@/components/Layout/Layout";
import { useAutoMsg } from "@/providers/MessagesProvider";
import { useAdminProtection } from "@/hooks/useAdminProtection";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@h001/ui";

// ─── 타입 ───────────────────────────────────────────────────────────────────

type NodeStatus = "ACTIVE" | "ISOLATED" | "MAINTENANCE" | "OFFLINE";
type NodeType = "PROXMOX" | "KVM" | "OTHER";

interface NodeItem {
  uuid: string;
  hostname: string;
  ip: string;
  type: NodeType;
  status: NodeStatus;
  description: string | null;
  hasCredentials: boolean;
  cpuUsagePercent: number | null;
  cpuTotal: number | null;
  memUsedBytes: number | null;
  memTotalBytes: number | null;
  diskUsedBytes: number | null;
  diskTotalBytes: number | null;
  metricsUpdatedAt: string | null;
}

interface NodeMetricsMessages {
  title: string;
  description: string;
  refresh: string;
  loading: string;
  empty: string;
  noMetrics: string;
  noCredentials: string;
  lastUpdated: string;
  cpu: string;
  mem: string;
  disk: string;
  status: { ACTIVE: string; ISOLATED: string; MAINTENANCE: string; OFFLINE: string };
}

interface MonitoringMessages {
  monitoring: {
    title: string;
    sub_title_1: string;
    clusterTitle: string;
    nodeMetrics: NodeMetricsMessages;
    topology: { title: string; description: string };
    traffic: { title: string; description: string; comingSoon: string };
    headroom: { title: string; description: string; noData: string; rank: string; node: string; freeRam: string; freeCpu: string };
  };
}

// ─── 헬퍼 ───────────────────────────────────────────────────────────────────

function fmtBytes(bytes: number | null): string {
  if (bytes == null) return "—";
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(0) + " MB";
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB";
}

function fmtTime(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

type MetricLevel = "normal" | "warning" | "critical";

function metricLevel(pct: number): MetricLevel {
  if (pct > 90) return "critical";
  if (pct > 75) return "warning";
  return "normal";
}

const BAR_COLOR: Record<MetricLevel, string> = {
  normal:   "var(--brand-600)",
  warning:  "var(--warn-600)",
  critical: "var(--danger-600)",
};

const TEXT_COLOR: Record<MetricLevel, string> = {
  normal:   "var(--brand-700)",
  warning:  "var(--warn-700)",
  critical: "var(--danger-700)",
};

const STATUS_BADGE: Record<NodeStatus, React.CSSProperties> = {
  ACTIVE:      { background: "var(--ok-50)",     color: "var(--ok-600)" },
  ISOLATED:    { background: "var(--warn-50)",    color: "var(--warn-600)" },
  MAINTENANCE: { background: "var(--warn-50)",    color: "var(--warn-600)" },
  OFFLINE:     { background: "var(--neutral-50)", color: "var(--neutral-600)" },
};

const STATUS_DOT: Record<NodeStatus, string> = {
  ACTIVE:      "#22c55e",
  ISOLATED:    "#f59e0b",
  MAINTENANCE: "#f59e0b",
  OFFLINE:     "#94a3b8",
};

// ─── 공통 컴포넌트 ────────────────────────────────────────────────────────────

function SectionTitle({ title, description }: { title: string; description: string }) {
  return (
    <div style={{ marginBottom: 12, paddingBottom: 10, borderBottom: "1px solid var(--border-1)" }}>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--fg-primary)" }}>{title}</p>
      <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--fg-muted)" }}>{description}</p>
    </div>
  );
}

function MiniBar({ pct, level }: { pct: number; level: MetricLevel }) {
  return (
    <div style={{ height: 4, background: "var(--bg-subtle)", borderRadius: 2 }}>
      <div style={{ height: 4, background: BAR_COLOR[level], borderRadius: 2, width: `${Math.min(pct, 100)}%`, transition: "width 300ms ease" }} />
    </div>
  );
}

// ─── 메트릭 카드 ──────────────────────────────────────────────────────────────

function MetricRow({ label, pct, detail, level }: { label: string; pct: number; detail: string; level: MetricLevel }) {
  return (
    <div style={{ marginBottom: 5 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
        <span style={{ fontSize: 9, color: "var(--fg-disabled)", minWidth: 30, flexShrink: 0 }}>{label}</span>
        <MiniBar pct={pct} level={level} />
        <span style={{ fontSize: 10, fontWeight: 600, color: TEXT_COLOR[level], minWidth: 36, textAlign: "right", flexShrink: 0 }}>
          {pct.toFixed(1)}%
        </span>
      </div>
      <p style={{ margin: 0, fontSize: 9, color: "var(--fg-disabled)", paddingLeft: 36, lineHeight: 1.3 }}>{detail}</p>
    </div>
  );
}

function NodeMetricCard({ node, t }: { node: NodeItem; t: NodeMetricsMessages }) {
  const cpuPct = node.cpuUsagePercent;
  const memPct = node.memTotalBytes && node.memUsedBytes != null
    ? (node.memUsedBytes / node.memTotalBytes) * 100 : null;
  const diskPct = node.diskTotalBytes && node.diskUsedBytes != null
    ? (node.diskUsedBytes / node.diskTotalBytes) * 100 : null;
  const hasMetrics = node.metricsUpdatedAt != null && cpuPct != null;

  return (
    <div style={{
      background: "var(--bg-surface)",
      border: "1px solid var(--border-1)",
      borderRadius: "var(--r-md)",
      padding: "14px 16px",
      display: "flex",
      flexDirection: "column",
      gap: 10,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--fg-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {node.hostname}
          </p>
          <p style={{ margin: "2px 0 0", fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--fg-muted)" }}>
            {node.ip} · {node.type}
          </p>
        </div>
        <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: "var(--r-xs)", flexShrink: 0, ...STATUS_BADGE[node.status] }}>
          {t.status[node.status]}
        </span>
      </div>

      <div>
        {!node.hasCredentials ? (
          <p style={{ margin: 0, fontSize: 11, color: "var(--fg-disabled)", textAlign: "center", padding: "10px 0" }}>{t.noCredentials}</p>
        ) : !hasMetrics ? (
          <p style={{ margin: 0, fontSize: 11, color: "var(--fg-disabled)", textAlign: "center", padding: "10px 0" }}>{t.noMetrics}</p>
        ) : (
          <>
            {cpuPct != null && (
              <MetricRow
                label={`${t.cpu}${node.cpuTotal ? ` ${node.cpuTotal}c` : ""}`}
                pct={cpuPct}
                detail={`${cpuPct.toFixed(1)}%`}
                level={metricLevel(cpuPct)}
              />
            )}
            {memPct != null && (
              <MetricRow
                label={t.mem}
                pct={memPct}
                detail={`${fmtBytes(node.memUsedBytes)} / ${fmtBytes(node.memTotalBytes)}`}
                level={metricLevel(memPct)}
              />
            )}
            {diskPct != null && (
              <MetricRow
                label={t.disk}
                pct={diskPct}
                detail={`${fmtBytes(node.diskUsedBytes)} / ${fmtBytes(node.diskTotalBytes)}`}
                level={metricLevel(diskPct)}
              />
            )}
          </>
        )}
      </div>

      {hasMetrics && (
        <p style={{ margin: 0, fontSize: 9, color: "var(--fg-disabled)", textAlign: "right" }}>
          {t.lastUpdated} {fmtTime(node.metricsUpdatedAt)}
        </p>
      )}
    </div>
  );
}

// ─── 토폴로지 ─────────────────────────────────────────────────────────────────

function TopologyView({ nodes }: { nodes: NodeItem[] }) {
  if (nodes.length === 0) return null;

  const SLOT = 110;
  const PAD = 32;
  const CY = 60;
  const svgW = nodes.length * SLOT + PAD * 2;
  const svgH = 128;

  return (
    <div style={{ overflowX: "auto" }}>
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        style={{ width: "100%", minWidth: Math.min(svgW, 360), height: svgH, display: "block" }}
        aria-label="Cluster topology"
      >
        {nodes.length > 1 && (
          <line
            x1={PAD + SLOT / 2}
            y1={CY}
            x2={PAD + (nodes.length - 1) * SLOT + SLOT / 2}
            y2={CY}
            stroke="var(--border-2, #e2e8f0)"
            strokeWidth={2}
            strokeDasharray="5 4"
          />
        )}

        {nodes.map((node, i) => {
          const cx = PAD + i * SLOT + SLOT / 2;
          const color = STATUS_DOT[node.status];
          const label = node.hostname.length > 11 ? node.hostname.slice(0, 10) + "…" : node.hostname;

          return (
            <g key={node.uuid}>
              <circle cx={cx} cy={CY} r={22} fill="var(--bg-subtle)" stroke={color} strokeWidth={2} />
              <circle cx={cx} cy={CY} r={6} fill={color} />
              <text x={cx} y={CY + 36} textAnchor="middle" fontSize={9} fill="var(--fg-muted)" fontFamily="var(--font-mono, monospace)">
                {label}
              </text>
              <text x={cx} y={CY + 47} textAnchor="middle" fontSize={8} fill="var(--fg-disabled)">
                {node.type}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── 실시간 트래픽 플레이스홀더 ────────────────────────────────────────────────

function TrafficPlaceholder({ comingSoon }: { comingSoon: string }) {
  return (
    <div style={{
      border: "1.5px dashed var(--border-2)",
      borderRadius: "var(--r-md)",
      padding: "32px 24px",
      textAlign: "center",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 12,
    }}>
      <div style={{
        width: 10,
        height: 10,
        borderRadius: "50%",
        background: "var(--brand-400)",
        boxShadow: "0 0 0 5px var(--brand-100)",
        animation: "pulse 2s ease-in-out infinite",
      }} />
      <p style={{ margin: 0, fontSize: 12, color: "var(--fg-muted)" }}>{comingSoon}</p>
    </div>
  );
}

// ─── 인스턴스 배치 여유 ────────────────────────────────────────────────────────

interface HeadroomMessages {
  title: string;
  description: string;
  noData: string;
  rank: string;
  node: string;
  freeRam: string;
  freeCpu: string;
}

function HeadroomSection({ nodes, t }: { nodes: NodeItem[]; t: HeadroomMessages }) {
  const ranked = [...nodes]
    .filter(n => n.memTotalBytes && n.memUsedBytes != null)
    .map(n => ({
      ...n,
      freeRam: (n.memTotalBytes ?? 0) - (n.memUsedBytes ?? 0),
      freeRamPct: n.memTotalBytes ? ((n.memTotalBytes - (n.memUsedBytes ?? 0)) / n.memTotalBytes) * 100 : 0,
      freeCpuCores: n.cpuTotal ? n.cpuTotal * (1 - (n.cpuUsagePercent ?? 0) / 100) : 0,
      freeCpuPct: 100 - (n.cpuUsagePercent ?? 0),
    }))
    .sort((a, b) => b.freeRam - a.freeRam);

  if (ranked.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "32px 16px", fontSize: 12, color: "var(--fg-muted)" }}>
        {t.noData}
      </div>
    );
  }

  const maxFreeRam = ranked[0].freeRam;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {ranked.map((node, i) => {
        const relativePct = maxFreeRam > 0 ? (node.freeRam / maxFreeRam) * 100 : 0;
        const ramLvl: MetricLevel = node.freeRamPct < 10 ? "critical" : node.freeRamPct < 25 ? "warning" : "normal";
        const cpuLvl: MetricLevel = node.freeCpuPct < 10 ? "critical" : node.freeCpuPct < 25 ? "warning" : "normal";
        const isTop = i === 0;

        return (
          <div key={node.uuid} style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 14px",
            background: isTop ? "var(--brand-50, #eff6ff)" : "var(--bg-surface)",
            border: `1px solid ${isTop ? "var(--brand-100, #dbeafe)" : "var(--border-1)"}`,
            borderRadius: "var(--r-md)",
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: isTop ? "var(--brand-600)" : "var(--fg-disabled)", minWidth: 18, textAlign: "center" }}>
              {i + 1}
            </span>

            <div style={{ minWidth: 120, flexShrink: 0 }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "var(--fg-primary)" }}>{node.hostname}</p>
              <p style={{ margin: "1px 0 0", fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--fg-disabled)" }}>{node.ip}</p>
            </div>

            <div style={{ flex: 2, minWidth: 100 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ fontSize: 9, color: "var(--fg-muted)" }}>{t.freeRam}</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: TEXT_COLOR[ramLvl] }}>{fmtBytes(node.freeRam)}</span>
              </div>
              <div style={{ height: 4, background: "var(--bg-subtle)", borderRadius: 2 }}>
                <div style={{ height: 4, background: BAR_COLOR[ramLvl], borderRadius: 2, width: `${relativePct}%`, transition: "width 300ms ease" }} />
              </div>
            </div>

            <div style={{ flex: 1, minWidth: 80 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ fontSize: 9, color: "var(--fg-muted)" }}>{t.freeCpu}</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: TEXT_COLOR[cpuLvl] }}>{node.freeCpuCores.toFixed(1)}c</span>
              </div>
              <div style={{ height: 4, background: "var(--bg-subtle)", borderRadius: 2 }}>
                <div style={{ height: 4, background: BAR_COLOR[cpuLvl], borderRadius: 2, width: `${Math.min(node.freeCpuPct, 100)}%`, transition: "width 300ms ease" }} />
              </div>
            </div>

            <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: "var(--r-xs)", flexShrink: 0, ...STATUS_BADGE[node.status] }}>
              {node.status}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── 메인 페이지 ──────────────────────────────────────────────────────────────

export default function MonitoringPage() {
  const isAdmin = useAdminProtection();
  const t = useAutoMsg() as unknown as MonitoringMessages | undefined;

  const [nodes, setNodes] = useState<NodeItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAdmin) fetchNodes();
  }, [isAdmin]);

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

  if (!isAdmin || !t) return null;

  const tm = t.monitoring;
  const tn = tm.nodeMetrics;
  const activeCount = nodes.filter(n => n.status === "ACTIVE").length;
  const metricsCount = nodes.filter(n => n.metricsUpdatedAt != null).length;

  return (
    <Layout navDomain="Nav" sidebarDomain="Admin">
      <PageHeader title={tm.title} subtitle={tm.sub_title_1} />

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "64px 16px", gap: 12 }}>
          <div style={{ width: 20, height: 20, border: "2px solid var(--brand-600)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
          <span style={{ fontSize: 13, color: "var(--fg-muted)" }}>{tn.loading}</span>
        </div>
      ) : nodes.length === 0 ? (
        <div style={{ textAlign: "center", padding: "64px 16px", fontSize: 13, color: "var(--fg-muted)" }}>{tn.empty}</div>
      ) : (
        <>
          {/* ── 클러스터 헤더 ─────────────────────────────────────────── */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 24,
            paddingBottom: 12,
            borderBottom: "2px solid var(--border-2)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 3, height: 20, background: "var(--brand-600)", borderRadius: 2, flexShrink: 0 }} />
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--fg-primary)" }}>{tm.clusterTitle}</h2>
              <span style={{ fontSize: 11, padding: "2px 8px", background: "var(--ok-50)", color: "var(--ok-600)", borderRadius: "var(--r-xs)" }}>
                {activeCount} / {nodes.length} active
              </span>
              {metricsCount > 0 && (
                <span style={{ fontSize: 11, padding: "2px 8px", background: "var(--info-50, #eff6ff)", color: "var(--info-600, #2563eb)", borderRadius: "var(--r-xs)" }}>
                  {metricsCount} metrics
                </span>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={fetchNodes} disabled={loading}>{tn.refresh}</Button>
          </div>

          {/* ── 메트릭 ───────────────────────────────────────────────── */}
          <div style={{ marginBottom: 32 }}>
            <SectionTitle title={tn.title} description={tn.description} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
              {nodes.map(node => (
                <NodeMetricCard key={node.uuid} node={node} t={tn} />
              ))}
            </div>
          </div>

          {/* ── 토폴로지 ─────────────────────────────────────────────── */}
          <div style={{ marginBottom: 32 }}>
            <SectionTitle title={tm.topology.title} description={tm.topology.description} />
            <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-1)", borderRadius: "var(--r-md)", padding: "16px 12px" }}>
              <TopologyView nodes={nodes} />
            </div>
          </div>

          {/* ── 실시간 트래픽 ─────────────────────────────────────────── */}
          <div style={{ marginBottom: 32 }}>
            <SectionTitle title={tm.traffic.title} description={tm.traffic.description} />
            <TrafficPlaceholder comingSoon={tm.traffic.comingSoon} />
          </div>

          {/* ── 인스턴스 배치 여유 ────────────────────────────────────── */}
          <div style={{ marginBottom: 32 }}>
            <SectionTitle title={tm.headroom.title} description={tm.headroom.description} />
            <HeadroomSection nodes={nodes} t={tm.headroom} />
          </div>
        </>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 5px var(--brand-100); }
          50% { box-shadow: 0 0 0 10px color-mix(in srgb, var(--brand-100) 40%, transparent); }
        }
      `}</style>
    </Layout>
  );
}
