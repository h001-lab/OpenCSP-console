"use client";

import Layout from "@/components/Layout/Layout";
import { useMsg } from "@/providers/MessagesProvider";

interface BillingMessages {
  title: string;
  description: string;
  summary: {
    title: string;
    cpu: string;
    storage: string;
    network: string;
    unit: { cpu: string; storage: string; network: string };
  };
  history: {
    title: string;
    empty: string;
    columns: { period: string; amount: string; status: string; issued: string };
  };
  status: { paid: string; pending: string; overdue: string };
}

export default function BillingPage() {
  const t = useMsg("Billing") as unknown as BillingMessages;
  if (!t) return null;

  // Placeholder data — replace with real API calls
  const usageSummary = [
    { label: t.summary.cpu, value: "0", unit: t.summary.unit.cpu },
    { label: t.summary.storage, value: "0", unit: t.summary.unit.storage },
    { label: t.summary.network, value: "0", unit: t.summary.unit.network },
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
          <div className="grid grid-cols-3 gap-4">
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
