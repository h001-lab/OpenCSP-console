"use client";

import { useEffect, useState } from "react";
import { Button } from "@h001/ui";
import { ConfigMap, FieldMeta, IntegrationsMessages, TestResult } from "./types";
import { ChevronIcon, FieldTable, TestResultBox } from "./common";

type IamProviderKey = "none" | "zitadel";

const IAM_PROVIDERS: { value: IamProviderKey; label: string }[] = [
  { value: "none", label: "None (no authentication)" },
  { value: "zitadel", label: "Zitadel" },
];

const IAM_PROVIDER_FIELDS: Record<IamProviderKey, FieldMeta[]> = {
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

interface IamConfigSectionProps {
  configs: ConfigMap;
  onSaved: () => void;
  t: IntegrationsMessages;
}

export function IamConfigSection({ configs, onSaved, t }: IamConfigSectionProps) {
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

  useEffect(() => {
    const initial: Record<string, string> = {};
    Object.values(IAM_PROVIDER_FIELDS).flat().forEach((f) => {
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
      const fields = IAM_PROVIDER_FIELDS[provider] ?? [];
      for (const field of fields) {
        const value = fieldValues[field.key] ?? "";
        if (field.sensitive && value === "****") continue;
        await fetch("/api/admin/configs", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category: "IAM", key: field.key, value, sensitive: field.sensitive ?? false }),
        });
      }
      await fetch("/api/admin/configs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: "GENERAL", key: "iam.provider", value: provider, sensitive: false }),
      });
      setSavedMsg({ ok: true, msg: ti.savedOk });
      setDirty(false);
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

  const fields = IAM_PROVIDER_FIELDS[provider] ?? [];

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <div
        className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between cursor-pointer select-none hover:bg-gray-100"
        onClick={() => setCollapsed((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <ChevronIcon collapsed={collapsed} />
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
          <div className="flex items-center gap-4 mb-4">
            <label className="text-xs text-gray-600 font-medium w-40 shrink-0">{ti.providerLabel}</label>
            <select
              className="border rounded px-2 py-1.5 text-xs bg-white"
              value={provider}
              onChange={(e) => handleProviderChange(e.target.value as IamProviderKey)}
            >
              {IAM_PROVIDERS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>

          <FieldTable
            fields={fields}
            fieldValues={fieldValues}
            onChange={handleFieldChange}
            keyColLabel={t.columns.key}
            valueColLabel={t.columns.value}
            unchangedHint={ti.unchangedHint}
          />

          {testResult && <TestResultBox result={testResult} passedMsg={ti.testPassed} failedMsg={ti.testFailed} />}

          {savedMsg && (
            <p className={`text-xs mb-3 ${savedMsg.ok ? "text-green-700" : "text-red-600"}`}>
              {savedMsg.ok ? `✓ ${savedMsg.msg}` : `✗ ${savedMsg.msg}`}
            </p>
          )}

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
