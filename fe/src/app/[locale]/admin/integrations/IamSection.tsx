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
      const providerRes = await fetch("/api/admin/configs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: "GENERAL", key: "iam.provider", value: provider, sensitive: false }),
      });
      if (!providerRes.ok) {
        const body = await providerRes.json().catch(() => null);
        const msg = body?.message ?? body?.error ?? t.saveFailed;
        setSavedMsg({ ok: false, msg });
        return;
      }
      setDirty(false);
      if (dbProvider === "none" && provider !== "none") {
        setSavedMsg({ ok: true, msg: ti.savedOk + " — " + ti.loginRequired });
      } else {
        setSavedMsg({ ok: true, msg: ti.savedOk });
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
    <div style={{
      background: "var(--bg-surface)",
      border: "1px solid var(--border-1)",
      borderRadius: "var(--r-md)",
      overflow: "hidden",
    }}>
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
        onClick={() => setCollapsed((v) => !v)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ChevronIcon collapsed={collapsed} />
          <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--fg-primary)" }}>IAM</span>
          <span style={{ fontSize: "11px", color: "var(--fg-muted)" }}>{t.descriptions["IAM"]}</span>
          {dirty && (
            <span style={{
              fontSize: "11px",
              background: "var(--warn-50)",
              color: "var(--warn-600)",
              border: "1px solid var(--warn-50)",
              padding: "2px 6px",
              borderRadius: "var(--r-xs)",
            }}>
              {ti.unsaved}
            </span>
          )}
        </div>
        <span style={{ fontSize: "11px", color: "var(--fg-disabled)", fontFamily: "var(--font-mono)" }}>IAM</span>
      </div>

      {!collapsed && (
        <div style={{ padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
            <label style={{ fontSize: "12px", color: "var(--fg-secondary)", fontWeight: 500, width: 160, flexShrink: 0 }}>{ti.providerLabel}</label>
            <select
              style={{
                border: "1px solid var(--border-1)",
                borderRadius: "var(--r-xs)",
                padding: "4px 8px",
                fontSize: "12px",
                background: "var(--bg-surface)",
                color: "var(--fg-primary)",
                outline: "none",
              }}
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
            <p style={{ fontSize: "12px", marginBottom: 12, color: savedMsg.ok ? "var(--ok-600)" : "var(--danger-600)" }}>
              {savedMsg.ok ? `✓ ${savedMsg.msg}` : `✗ ${savedMsg.msg}`}
            </p>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            {provider !== "none" && (
              <Button variant="default" size="sm" onClick={handleTest} disabled={testing || saving}>
                {testing ? ti.testing : ti.testBtn}
              </Button>
            )}
            <Button variant="default" size="sm" onClick={handleSave} disabled={saving || testing}>
              {saving ? ti.saving : ti.saveBtn}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
