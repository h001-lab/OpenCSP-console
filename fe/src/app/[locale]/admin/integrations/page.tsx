"use client";

import { useEffect, useState } from "react";
import Layout from "@/components/Layout/Layout";
import { Button } from "@h001/ui";
import { useAdminProtection } from "@/hooks/useAdminProtection";
import { useMsg } from "@/providers/MessagesProvider";

// ─── 타입 ───────────────────────────────────────────────────────────────────

type ConfigCategory = "IAM" | "K8S" | "AI" | "SEMAPHORE" | "PROVISION" | "GENERAL";

interface ConfigEntry {
  category: ConfigCategory;
  key: string;
  value: string;
  sensitive: boolean;
  description: string | null;
  updatedBy: string | null;
  updatedAt: string | null;
}

type ConfigMap = Record<ConfigCategory, ConfigEntry[]>;

interface FieldMeta {
  key: string;
  label: string;
  sensitive?: boolean;
  type?: "text" | "password" | "textarea";
  description?: string;
}

interface IamMessages {
  providerLabel: string;
  unsaved: string;
  testBtn: string;
  testing: string;
  testPassed: string;
  testFailed: string;
  saveBtn: string;
  saving: string;
  savedOk: string;
  unchangedHint: string;
  loginRequired: string;
}

interface IntegrationsMessages {
  title: string;
  description: string;
  loading: string;
  saveFailed: string;
  columns: { key: string; value: string; source: string };
  actions: { edit: string; save: string; saving: string; cancel: string; delete: string };
  sensitivePlaceholder: string;
  deleteConfirm: string;
  descriptions: Record<string, string>;
  iam: IamMessages;
}

// ─── IAM provider별 필드 정의 ────────────────────────────────────────────────

type IamProviderKey = "none" | "zitadel";

const IAM_PROVIDERS: { value: IamProviderKey; label: string }[] = [
  { value: "none", label: "None (no authentication)" },
  { value: "zitadel", label: "Zitadel" },
];

const PROVIDER_FIELDS: Record<IamProviderKey, FieldMeta[]> = {
  none: [],
  zitadel: [
    { key: "zitadel.issuer-uri",    label: "Issuer URI",      description: "https://your-instance.zitadel.cloud" },
    { key: "zitadel.client-id",     label: "Client ID" },
    { key: "zitadel.client-secret", label: "Client Secret",   sensitive: true, type: "password" },
    { key: "zitadel.org-id",        label: "Organization ID" },
    { key: "zitadel.project-id",    label: "Project ID" },
    { key: "zitadel.service-token", label: "Service Token",   sensitive: true, type: "password" },
  ],
};

// ─── IAM 전용 섹션 컴포넌트 ──────────────────────────────────────────────────

interface TestStep { name: string; success: boolean; message: string }
interface TestResult { success: boolean; steps: TestStep[] }

interface IamConfigSectionProps {
  configs: ConfigMap;
  onSaved: () => void;
  t: IntegrationsMessages;
}

function IamConfigSection({ configs, onSaved, t }: IamConfigSectionProps) {
  const ti = t.iam;

  const dbProvider = (configs.GENERAL?.find((c) => c.key === "iam.provider")?.value ?? "none") as IamProviderKey;

  const [provider, setProvider] = useState<IamProviderKey>(dbProvider);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<{ ok: boolean; msg: string } | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  // configs가 로드되면 초기값 세팅
  useEffect(() => {
    const initial: Record<string, string> = {};
    Object.values(PROVIDER_FIELDS).flat().forEach((f) => {
      initial[f.key] = configs.IAM?.find((c) => c.key === f.key)?.value ?? "";
    });
    setFieldValues(initial);
    setProvider(dbProvider);
    setDirty(false);
    setTestResult(null);
    setSavedMsg(null);
  }, [configs]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleProviderChange(val: IamProviderKey) {
    setProvider(val);
    setDirty(true);
    setTestResult(null);
    setSavedMsg(null);
  }

  function handleFieldChange(key: string, value: string) {
    setFieldValues((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
    setTestResult(null);
    setSavedMsg(null);
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/configs/iam/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          issuerUri: fieldValues["zitadel.issuer-uri"] ?? "",
          // "****"이면 빈 문자열로 → 백엔드가 DB 값 사용
          serviceToken: fieldValues["zitadel.service-token"] === "****"
            ? ""
            : (fieldValues["zitadel.service-token"] ?? ""),
        }),
      });
      setTestResult(await res.json());
    } catch {
      setTestResult({ success: false, steps: [{ name: "Error", success: false, message: "Request failed" }] });
    } finally {
      setTesting(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setSavedMsg(null);
    try {
      // 1. provider별 필드 먼저 저장 (provider 변경 전에 credentials 확보)
      const fields = PROVIDER_FIELDS[provider] ?? [];
      for (const field of fields) {
        const value = fieldValues[field.key] ?? "";
        // sensitive 필드에서 "****"는 변경 없음 → 스킵
        if (field.sensitive && value === "****") continue;
        await fetch("/api/admin/configs", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category: "IAM",
            key: field.key,
            value,
            sensitive: field.sensitive ?? false,
          }),
        });
      }

      // 2. iam.provider 마지막에 저장 (이 시점부터 BE 인증 모드 전환)
      await fetch("/api/admin/configs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: "GENERAL", key: "iam.provider", value: provider, sensitive: false }),
      });

      setSavedMsg({ ok: true, msg: ti.savedOk });
      setDirty(false);

      // none → 유인증 provider로 변경 시 로그인 필요 → fetchConfigs 대신 로그인 안내
      if (dbProvider === "none" && provider !== "none") {
        setSavedMsg({ ok: true, msg: ti.savedOk + " — " + ti.loginRequired });
      } else {
        onSaved();
      }
    } catch {
      setSavedMsg({ ok: false, msg: t.saveFailed });
    } finally {
      setSaving(false);
    }
  }

  const fields = PROVIDER_FIELDS[provider] ?? [];

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      {/* 헤더 */}
      <div
        className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between cursor-pointer select-none hover:bg-gray-100"
        onClick={() => setCollapsed((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <svg
            className={`h-4 w-4 text-gray-400 transition-transform ${collapsed ? "-rotate-90" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          <span className="text-sm font-semibold text-gray-900">IAM</span>
          <span className="text-xs text-gray-500">{t.descriptions["IAM"]}</span>
          {dirty && (
            <span className="text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 px-1.5 py-0.5 rounded">
              {ti.unsaved}
            </span>
          )}
        </div>
        <span className="text-xs text-gray-400">IAM</span>
      </div>

      {!collapsed && (
        <div className="p-4">
          {/* Provider 선택 */}
          <div className="flex items-center gap-4 mb-4">
            <label className="text-xs text-gray-600 font-medium w-40 shrink-0">{ti.providerLabel}</label>
            <select
              className="border rounded px-2 py-1.5 text-xs bg-white"
              value={provider}
              onChange={(e) => handleProviderChange(e.target.value as IamProviderKey)}
            >
              {IAM_PROVIDERS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* provider별 필드 */}
          {fields.length > 0 && (
            <div className="border rounded overflow-hidden mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 border-b bg-gray-50/50">
                    <th className="text-left px-4 py-2 font-medium w-48">{t.columns.key}</th>
                    <th className="text-left px-4 py-2 font-medium">{t.columns.value}</th>
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field) => {
                    const val = fieldValues[field.key] ?? "";
                    const isUnchanged = field.sensitive && val === "****";
                    return (
                      <tr key={field.key} className="border-b last:border-b-0 hover:bg-gray-50/30">
                        <td className="px-4 py-2.5 text-gray-700 font-mono text-xs whitespace-nowrap">
                          {field.key}
                          {field.description && (
                            <div className="text-gray-400 font-sans">{field.description}</div>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <input
                            type={field.sensitive ? "password" : "text"}
                            className="w-full border rounded px-2 py-1 text-xs font-mono"
                            value={isUnchanged ? "" : val}
                            placeholder={isUnchanged ? ti.unchangedHint : ""}
                            onChange={(e) => handleFieldChange(field.key, e.target.value)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* 테스트 결과 */}
          {testResult && (
            <div className={`rounded p-3 text-xs mb-3 ${testResult.success
              ? "bg-green-50 border border-green-200"
              : "bg-red-50 border border-red-200"}`}
            >
              <p className={`font-semibold mb-1 ${testResult.success ? "text-green-800" : "text-red-800"}`}>
                {testResult.success ? `✓ ${ti.testPassed}` : `✗ ${ti.testFailed}`}
              </p>
              {testResult.steps.map((step, i) => (
                <p key={i} className={step.success ? "text-green-700" : "text-red-700"}>
                  {step.success ? "✓" : "✗"} <span className="font-medium">{step.name}:</span> {step.message}
                </p>
              ))}
            </div>
          )}

          {/* 저장 결과 */}
          {savedMsg && (
            <p className={`text-xs mb-3 ${savedMsg.ok ? "text-green-700" : "text-red-600"}`}>
              {savedMsg.ok ? `✓ ${savedMsg.msg}` : `✗ ${savedMsg.msg}`}
            </p>
          )}

          {/* 버튼 */}
          <div className="flex gap-2">
            {provider !== "none" && (
              <Button variant="default" className="text-xs px-3 py-1.5" onClick={handleTest} disabled={testing || saving}>
                {testing ? ti.testing : ti.testBtn}
              </Button>
            )}
            <Button variant="default" className="text-xs px-3 py-1.5" onClick={handleSave} disabled={saving || testing}>
              {saving ? ti.saving : ti.saveBtn}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 나머지 카테고리 메타데이터 ────────────────────────────────────────────────

const INTEGRATION_FIELDS: Partial<Record<ConfigCategory, { title: string; fields: FieldMeta[] }>> = {
  K8S: {
    title: "Kubernetes / FluxCD",
    fields: [
      { key: "enabled",                        label: "Enabled",               description: "true | false" },
      { key: "kubeconfig",                     label: "Kubeconfig Path" },
      { key: "flux.namespace",                 label: "Flux Namespace" },
      { key: "flux.git-repository-namespace",  label: "GitRepository Namespace" },
      { key: "flux.interval",                  label: "Reconcile Interval",    description: "e.g. 5m" },
    ],
  },
  AI: {
    title: "AI",
    fields: [
      { key: "enabled",           label: "Enabled",                   description: "true | false" },
      { key: "openai.api-key",    label: "OpenAI / Gemini API Key",   sensitive: true, type: "password" },
      { key: "openai.base-url",   label: "Base URL" },
      { key: "openai.model",      label: "Model" },
      { key: "vertex.project-id", label: "Vertex Project ID" },
      { key: "vertex.location",   label: "Vertex Location" },
    ],
  },
  SEMAPHORE: {
    title: "Semaphore",
    fields: [],
  },
  PROVISION: {
    title: "Provisioning",
    fields: [
      { key: "history-retention-days", label: "History Retention Days", description: "Days to keep provision history (0 = disabled)" },
    ],
  },
  GENERAL: {
    title: "General",
    fields: [
      // iam.provider는 IAM 섹션에서 관리하므로 여기서는 배너 관련만 노출
      { key: "banner.message", label: "Banner Message" },
      { key: "banner.link",    label: "Banner Link" },
    ],
  },
};

// IAM은 위의 IamConfigSection에서 별도 렌더링
const CATEGORY_ORDER: ConfigCategory[] = ["K8S", "AI", "SEMAPHORE", "PROVISION", "GENERAL"];

// ─── 메인 페이지 ──────────────────────────────────────────────────────────────

export default function IntegrationsPage() {
  const isAdmin = useAdminProtection();
  const adminMsg = useMsg("Admin") as unknown as { integrations: IntegrationsMessages } | undefined;
  const [configs, setConfigs] = useState<ConfigMap>({} as ConfigMap);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isAdmin) fetchConfigs();
  }, [isAdmin]);

  if (!isAdmin || !adminMsg) return null;

  const t = adminMsg.integrations;

  async function fetchConfigs() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/configs");
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to fetch");
      const json = await res.json();
      setConfigs(json.data ?? json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  function getConfigValue(category: ConfigCategory, key: string): string {
    return configs[category]?.find((c) => c.key === key)?.value ?? "";
  }

  function startEdit(category: ConfigCategory, field: FieldMeta) {
    setEditingKey(`${category}.${field.key}`);
    const current = getConfigValue(category, field.key);
    setEditValue(current === "****" ? "" : current);
  }

  async function saveEdit(category: ConfigCategory, field: FieldMeta) {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/configs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          key: field.key,
          value: editValue,
          sensitive: field.sensitive ?? false,
          description: field.description ?? null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).message ?? "Save failed");
      setEditingKey(null);
      await fetchConfigs();
    } catch (e) {
      alert(e instanceof Error ? e.message : t.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  async function deleteConfig(category: ConfigCategory, key: string) {
    if (!confirm(t.deleteConfirm.replace("{key}", key))) return;
    await fetch(`/api/admin/configs/${category}/${encodeURIComponent(key)}`, { method: "DELETE" });
    await fetchConfigs();
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
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            <span className="ml-3 text-sm text-gray-600">{t.loading}</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="flex flex-col gap-4">
            {/* IAM 전용 섹션 */}
            <IamConfigSection configs={configs} onSaved={fetchConfigs} t={t} />

            {/* 나머지 카테고리 (기존 테이블 뷰) */}
            {CATEGORY_ORDER.map((category) => {
              const meta = INTEGRATION_FIELDS[category];
              if (!meta) return null;

              const existingKeys = new Set((configs[category] ?? []).map((c) => c.key));
              // GENERAL에서 iam.provider는 IAM 섹션에서 관리하므로 숨김
              const hiddenKeys = category === "GENERAL" ? new Set(["iam.provider"]) : new Set<string>();
              const extraEntries = (configs[category] ?? []).filter(
                (c) => !meta.fields.some((f) => f.key === c.key) && !hiddenKeys.has(c.key)
              );
              const isCollapsed = collapsed[category] ?? false;

              return (
                <div key={category} className="bg-white rounded-lg border overflow-hidden">
                  <div
                    className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between cursor-pointer select-none hover:bg-gray-100"
                    onClick={() => setCollapsed((prev) => ({ ...prev, [category]: !isCollapsed }))}
                  >
                    <div className="flex items-center gap-2">
                      <svg
                        className={`h-4 w-4 text-gray-400 transition-transform ${isCollapsed ? "-rotate-90" : ""}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                      <span className="text-sm font-semibold text-gray-900">{meta.title}</span>
                      <span className="text-xs text-gray-500">{t.descriptions[category]}</span>
                    </div>
                    <span className="text-xs text-gray-400">{category}</span>
                  </div>

                  {!isCollapsed && (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-gray-500 border-b bg-gray-50/50">
                          <th className="text-left px-4 py-2 font-medium w-48">{t.columns.key}</th>
                          <th className="text-left px-4 py-2 font-medium">{t.columns.value}</th>
                          <th className="text-left px-4 py-2 font-medium w-16">{t.columns.source}</th>
                          <th className="px-4 py-2 w-28" />
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          ...meta.fields.map((f) => ({ field: f, fromDb: existingKeys.has(f.key) })),
                          ...extraEntries.map((e) => ({
                            field: { key: e.key, label: e.key, sensitive: e.sensitive } as FieldMeta,
                            fromDb: true,
                          })),
                        ].map(({ field, fromDb }) => {
                          const edKey = `${category}.${field.key}`;
                          const isEditing = editingKey === edKey;
                          const currentVal = getConfigValue(category, field.key);

                          return (
                            <tr key={field.key} className="border-b last:border-b-0 hover:bg-gray-50/50">
                              <td className="px-4 py-2.5 text-gray-700 font-mono text-xs whitespace-nowrap">
                                {field.key}
                                {field.description && (
                                  <div className="text-gray-400 font-sans">{field.description}</div>
                                )}
                              </td>
                              <td className="px-4 py-2.5">
                                {isEditing ? (
                                  field.type === "textarea" ? (
                                    <textarea
                                      className="w-full border rounded px-2 py-1 text-xs font-mono resize-none"
                                      rows={3}
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      placeholder={field.sensitive ? t.sensitivePlaceholder : ""}
                                    />
                                  ) : (
                                    <input
                                      type={field.sensitive ? "password" : "text"}
                                      className="w-full border rounded px-2 py-1 text-xs font-mono"
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      placeholder={field.sensitive ? t.sensitivePlaceholder : ""}
                                      autoFocus
                                    />
                                  )
                                ) : (
                                  <span className={`font-mono text-xs ${!currentVal ? "text-gray-300 italic" : "text-gray-700"}`}>
                                    {currentVal || "—"}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-2.5">
                                <span className={`text-xs px-1.5 py-0.5 rounded ${fromDb ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-500"}`}>
                                  {fromDb ? "DB" : "env"}
                                </span>
                              </td>
                              <td className="px-4 py-2.5">
                                {isEditing ? (
                                  <div className="flex gap-1">
                                    <Button
                                      variant="default"
                                      className="text-xs px-2 py-1"
                                      onClick={() => saveEdit(category, field)}
                                      disabled={saving}
                                    >
                                      {saving ? t.actions.saving : t.actions.save}
                                    </Button>
                                    <button
                                      className="text-xs px-2 py-1 text-gray-500 hover:text-gray-700"
                                      onClick={() => setEditingKey(null)}
                                    >
                                      {t.actions.cancel}
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex gap-1">
                                    <button
                                      className="text-xs text-blue-600 hover:underline"
                                      onClick={() => startEdit(category, field)}
                                    >
                                      {t.actions.edit}
                                    </button>
                                    {fromDb && (
                                      <button
                                        className="text-xs text-red-400 hover:underline ml-1"
                                        onClick={() => deleteConfig(category, field.key)}
                                      >
                                        {t.actions.delete}
                                      </button>
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </Layout>
  );
}
