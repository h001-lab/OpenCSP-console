"use client";

import { useEffect, useState } from "react";
import { Button } from "@h001/ui";
import { ConfigMap, FieldMeta, IntegrationsMessages, TestResult } from "./types";
import { ChevronIcon, FieldTable, TestResultBox } from "./common";

type PamProviderKey = "none" | "teleport";

const PAM_PROVIDERS: { value: PamProviderKey; label: string }[] = [
  { value: "none", label: "None (disabled)" },
  { value: "teleport", label: "Teleport" },
];

const PAM_PROVIDER_FIELDS: Record<PamProviderKey, FieldMeta[]> = {
  none: [],
  teleport: [
    { key: "teleport.proxy.url",  label: "Proxy URL",      description: "https://teleport.example.com:3080" },
    { key: "teleport.bot.user",   label: "Bot User" },
    { key: "teleport.bot.pass",   label: "Bot Password",   sensitive: true, type: "password" },
    { key: "teleport.insecure",   label: "Insecure TLS",   description: "true | false" },
    { key: "teleport.tsh.path",   label: "tsh Binary Path", description: "/usr/local/bin/tsh (로컬: which tsh)" },
    { key: "teleport.tsh.ttl",    label: "Cert TTL",        description: "12h · 24h · 168h — Go Adapter 전환 시 제거" },
    { key: "teleport.ssh.port",   label: "SSH Proxy Port",  description: "443 (k8s ALPN) 또는 3023 (전통 배포)" },
  ],
};

interface PamConfigSectionProps {
  configs: ConfigMap;
  onSaved: () => void;
  t: IntegrationsMessages;
}

export function PamConfigSection({ configs, onSaved, t }: PamConfigSectionProps) {
  const tp = t.pam;
  const dbProvider = (configs.GENERAL?.find((c) => c.key === "pam.provider")?.value ?? "none") as PamProviderKey;

  const [provider, setProvider] = useState<PamProviderKey>(dbProvider);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<{ ok: boolean; msg: string } | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mfaToken, setMfaToken] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  useEffect(() => {
    const initial: Record<string, string> = {};
    Object.values(PAM_PROVIDER_FIELDS).flat().forEach((f) => {
      initial[f.key] = configs.IAM?.find((c) => c.key === f.key)?.value ?? "";
    });
    setFieldValues(initial);
    setProvider(dbProvider);
    setDirty(false);
    setSavedMsg(null);
  }, [configs]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleProviderChange(val: PamProviderKey) {
    setProvider(val);
    setDirty(true);
    setSavedMsg(null);
  }

  function handleFieldChange(key: string, value: string) {
    setFieldValues((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
    setSavedMsg(null);
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/configs/pam/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proxyUrl:  fieldValues["teleport.proxy.url"] ?? "",
          botUser:   fieldValues["teleport.bot.user"] ?? "",
          botPass:   fieldValues["teleport.bot.pass"] ?? "",
          mfaToken,
          insecure:  fieldValues["teleport.insecure"] ?? "",
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
      const fields = PAM_PROVIDER_FIELDS[provider] ?? [];
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
        body: JSON.stringify({ category: "GENERAL", key: "pam.provider", value: provider, sensitive: false }),
      });
      setSavedMsg({ ok: true, msg: tp.savedOk });
      setDirty(false);
      onSaved();
    } catch {
      setSavedMsg({ ok: false, msg: t.saveFailed });
    } finally {
      setSaving(false);
    }
  }

  const fields = PAM_PROVIDER_FIELDS[provider] ?? [];

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <div
        className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between cursor-pointer select-none hover:bg-gray-100"
        onClick={() => setCollapsed((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <ChevronIcon collapsed={collapsed} />
          <span className="text-sm font-semibold text-gray-900">PAM</span>
          <span className="text-xs text-gray-500">{t.descriptions["PAM"] ?? "Privileged Access Management"}</span>
          {dirty && (
            <span className="text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 px-1.5 py-0.5 rounded">
              {tp.unsaved}
            </span>
          )}
        </div>
        <span className="text-xs text-gray-400">PAM</span>
      </div>

      {!collapsed && (
        <div className="p-4">
          <div className="flex items-center gap-4 mb-4">
            <label className="text-xs text-gray-600 font-medium w-40 shrink-0">{tp.providerLabel}</label>
            <select
              className="border rounded px-2 py-1.5 text-xs bg-white"
              value={provider}
              onChange={(e) => handleProviderChange(e.target.value as PamProviderKey)}
            >
              {PAM_PROVIDERS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>

          <FieldTable
            fields={fields}
            fieldValues={fieldValues}
            onChange={handleFieldChange}
            keyColLabel={t.columns.key}
            valueColLabel={t.columns.value}
            unchangedHint={tp.unchangedHint}
          />

          {provider === "teleport" && (
            <div className="flex items-center gap-4 mt-2 mb-4">
              <label className="text-xs text-gray-600 font-medium w-40 shrink-0">{tp.mfaLabel}</label>
              <input
                type="text"
                className="border rounded px-2 py-1.5 text-xs font-mono w-32"
                placeholder={tp.mfaPlaceholder}
                value={mfaToken}
                onChange={(e) => setMfaToken(e.target.value)}
                maxLength={8}
              />
            </div>
          )}

          {testResult && (
            <TestResultBox result={testResult} passedMsg={tp.testPassed} failedMsg={tp.testFailed} />
          )}

          {savedMsg && (
            <p className={`text-xs mb-3 ${savedMsg.ok ? "text-green-700" : "text-red-600"}`}>
              {savedMsg.ok ? `✓ ${savedMsg.msg}` : `✗ ${savedMsg.msg}`}
            </p>
          )}

          <div className="flex gap-2">
            {provider === "teleport" && (
              <Button variant="outline" className="text-xs px-3 py-1.5" onClick={handleTest} disabled={testing}>
                {testing ? tp.testing : tp.testBtn}
              </Button>
            )}
            <Button variant="default" className="text-xs px-3 py-1.5" onClick={handleSave} disabled={saving}>
              {saving ? tp.saving : tp.saveBtn}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
