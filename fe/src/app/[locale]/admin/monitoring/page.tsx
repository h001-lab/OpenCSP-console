"use client";

import { useEffect, useState } from "react";
import Layout from "@/components/Layout/Layout";
import { useAutoMsg } from "@/providers/MessagesProvider";
import { useAdminProtection } from "@/hooks/useAdminProtection";

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
    nodeMetrics: NodeMetricsMessages;
  };
}

// ─── 헬퍼 ───────────────────────────────────────────────────────────────────

function fmtBytes(bytes: number | null): string {
  if (bytes == null) return "—";
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(0) + " MB";
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB";
}

function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function MetricBar({ label, pct, detail, color }: { label: string; pct: number; detail: string; color: string }) {
  return (
    <div className="mb-2">
      <div className="flex justify-between items-center mb-0.5">
        <span className="text-xs text-gray-500">{label}</span>
        <span className="text-xs text-gray-500">{detail}</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-1.5">
        <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  );
}

function metricColor(pct: number): string {
  if (pct > 90) return "bg-red-500";
  if (pct > 75) return "bg-orange-400";
  return "bg-blue-400";
}

// ─── 노드 메트릭 카드 ─────────────────────────────────────────────────────────

const STATUS_COLORS: Record<NodeStatus, string> = {
  ACTIVE:      "bg-green-50 text-green-700 border-green-200",
  ISOLATED:    "bg-yellow-50 text-yellow-700 border-yellow-200",
  MAINTENANCE: "bg-orange-50 text-orange-700 border-orange-200",
  OFFLINE:     "bg-gray-100 text-gray-500 border-gray-200",
};

function NodeMetricCard({ node, t }: { node: NodeItem; t: NodeMetricsMessages }) {
  const cpuPct = node.cpuUsagePercent;
  const memPct = node.memTotalBytes && node.memUsedBytes != null
    ? (node.memUsedBytes / node.memTotalBytes) * 100
    : null;
  const diskPct = node.diskTotalBytes && node.diskUsedBytes != null
    ? (node.diskUsedBytes / node.diskTotalBytes) * 100
    : null;
  const hasMetrics = node.metricsUpdatedAt != null && cpuPct != null;

  return (
    <div className="bg-white rounded-lg border p-4 flex flex-col gap-3">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">{node.hostname}</p>
          <p className="text-xs text-gray-400 font-mono">{node.ip}</p>
          <p className="text-xs text-gray-400 mt-0.5">{node.type}</p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded border shrink-0 ${STATUS_COLORS[node.status]}`}>
          {t.status[node.status]}
        </span>
      </div>

      {/* 메트릭 */}
      <div className="flex-1">
        {!node.hasCredentials ? (
          <p className="text-xs text-gray-300 text-center py-3">{t.noCredentials}</p>
        ) : !hasMetrics ? (
          <p className="text-xs text-gray-300 text-center py-3">{t.noMetrics}</p>
        ) : (
          <>
            {cpuPct != null && (
              <MetricBar
                label={`${t.cpu}${node.cpuTotal ? ` (${node.cpuTotal}c)` : ""}`}
                pct={cpuPct}
                detail={`${cpuPct.toFixed(1)}%`}
                color={metricColor(cpuPct)}
              />
            )}
            {memPct != null && (
              <MetricBar
                label={t.mem}
                pct={memPct}
                detail={`${fmtBytes(node.memUsedBytes)} / ${fmtBytes(node.memTotalBytes)}`}
                color={metricColor(memPct)}
              />
            )}
            {diskPct != null && (
              <MetricBar
                label={t.disk}
                pct={diskPct}
                detail={`${fmtBytes(node.diskUsedBytes)} / ${fmtBytes(node.diskTotalBytes)}`}
                color={metricColor(diskPct)}
              />
            )}
          </>
        )}
      </div>

      {/* 업데이트 시간 */}
      {hasMetrics && (
        <p className="text-xs text-gray-300 text-right">
          {t.lastUpdated} {fmtTime(node.metricsUpdatedAt)}
        </p>
      )}
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
      <main className="p-3 gap-3">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-700 mb-1">{tm.title}</h2>
          <hr className="mt-2" />
        </div>

        {/* 노드 메트릭 섹션 */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-700">{tn.title}</h3>
              <p className="text-xs text-gray-400">{tn.description}</p>
            </div>
            <div className="flex items-center gap-3">
              {/* 요약 뱃지 */}
              {!loading && nodes.length > 0 && (
                <div className="flex gap-2 text-xs text-gray-500">
                  <span className="px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded">
                    {activeCount} Active
                  </span>
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-200 rounded">
                    {metricsCount} / {nodes.length} Metrics
                  </span>
                </div>
              )}
              <button
                className="text-xs text-gray-500 hover:text-gray-700 border rounded px-2.5 py-1 hover:bg-gray-50"
                onClick={fetchNodes}
                disabled={loading}
              >
                {tn.refresh}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
              <span className="ml-3 text-sm text-gray-500">{tn.loading}</span>
            </div>
          ) : nodes.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-400">{tn.empty}</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {nodes.map(node => (
                <NodeMetricCard key={node.uuid} node={node} t={tn} />
              ))}
            </div>
          )}
        </section>
      </main>
    </Layout>
  );
}
