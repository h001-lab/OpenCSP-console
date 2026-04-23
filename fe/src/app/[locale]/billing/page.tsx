"use client";

import Layout from "@/components/Layout/Layout";
import { useMsg } from "@/providers/MessagesProvider";
import { useEffect, useState } from "react";

interface BillingMessages {
  title: string;
  description: string;
  summary: {
    title: string;
    provisions: string;
    activeProvisions: string;
    consoleSessions: string;
    consoleMinutes: string;
    unit: {
      provisions: string;
      activeProvisions: string;
      consoleSessions: string;
      consoleMinutes: string;
    };
    cpuQuota: {
      title: string;
      used: string;
      limit: string;
      unlimited: string;
      unit: string;
      of: string;
    };
  };
  history: {
    title: string;
    empty: string;
    columns: { period: string; amount: string; status: string; issued: string };
  };
  status: { paid: string; pending: string; overdue: string };
}

interface BillingSummary {
  totalProvisions: number;
  activeProvisions: number;
  totalConsoleSessions: number;
  totalConsoleMinutes: number;
  monthlyCpuUsed: number;
  monthlyCpuLimit: number;
}

export default function BillingPage() {
  const t = useMsg("Billing") as unknown as BillingMessages;
  const [summary, setSummary] = useState<BillingSummary | null>(null);

  useEffect(() => {
    fetch("/api/billing/summary")
      .then((r) => r.json())
      .then((data: BillingSummary) => setSummary(data))
      .catch(() => {});
  }, []);

  if (!t) return null;

  const usageSummary = summary
    ? [
        {
          label: t.summary.provisions,
          value: String(summary.totalProvisions),
          unit: t.summary.unit.provisions,
        },
        {
          label: t.summary.activeProvisions,
          value: String(summary.activeProvisions),
          unit: t.summary.unit.activeProvisions,
        },
        {
          label: t.summary.consoleSessions,
          value: String(summary.totalConsoleSessions),
          unit: t.summary.unit.consoleSessions,
        },
        {
          label: t.summary.consoleMinutes,
          value: String(summary.totalConsoleMinutes),
          unit: t.summary.unit.consoleMinutes,
        },
      ]
    : [
        { label: t.summary.provisions, value: "—", unit: t.summary.unit.provisions },
        { label: t.summary.activeProvisions, value: "—", unit: t.summary.unit.activeProvisions },
        { label: t.summary.consoleSessions, value: "—", unit: t.summary.unit.consoleSessions },
        { label: t.summary.consoleMinutes, value: "—", unit: t.summary.unit.consoleMinutes },
      ];

  return (
    <Layout navDomain="Nav" sidebarDomain="Billing">
      <div className="p-6 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
          <p className="text-sm text-gray-500 mt-1">{t.description}</p>
        </div>

        {/* Usage summary cards */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            {t.summary.title}
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {usageSummary.map((item) => (
              <div key={item.label} className="bg-white rounded-lg border p-4">
                <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                <p className="text-2xl font-bold text-gray-800">
                  {item.value}
                  <span className="text-sm font-normal text-gray-400 ml-1">{item.unit}</span>
                </p>
              </div>
            ))}
          </div>

          {/* Monthly CPU quota */}
          <div className="mt-4 bg-white rounded-lg border p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-500">{t.summary.cpuQuota.title}</p>
              <p className="text-xs text-gray-500">
                {summary
                  ? summary.monthlyCpuLimit > 0
                    ? `${summary.monthlyCpuUsed} ${t.summary.cpuQuota.of} ${summary.monthlyCpuLimit} ${t.summary.cpuQuota.unit}`
                    : t.summary.cpuQuota.unlimited
                  : "—"}
              </p>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              {summary && summary.monthlyCpuLimit > 0 ? (
                <div
                  className="h-2 rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (summary.monthlyCpuUsed / summary.monthlyCpuLimit) * 100)}%`,
                    backgroundColor:
                      summary.monthlyCpuUsed / summary.monthlyCpuLimit >= 0.9
                        ? "#ef4444"
                        : summary.monthlyCpuUsed / summary.monthlyCpuLimit >= 0.7
                          ? "#f59e0b"
                          : "#3b82f6",
                  }}
                />
              ) : (
                <div className="h-2 rounded-full bg-blue-500" style={{ width: summary ? "8px" : "0%" }} />
              )}
            </div>
          </div>
        </section>

        {/* Billing history */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            {t.history.title}
          </h2>
          <div className="bg-white rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b bg-gray-50">
                  <th className="text-left px-4 py-2 font-medium">{t.history.columns.period}</th>
                  <th className="text-left px-4 py-2 font-medium">{t.history.columns.amount}</th>
                  <th className="text-left px-4 py-2 font-medium">{t.history.columns.status}</th>
                  <th className="text-left px-4 py-2 font-medium">{t.history.columns.issued}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={4} className="text-center py-12 text-sm text-gray-400">
                    {t.history.empty}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </Layout>
  );
}
