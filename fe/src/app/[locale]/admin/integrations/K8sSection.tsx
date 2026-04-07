"use client";

import { useEffect, useState } from "react";
import { Button } from "@h001/ui";
import { ConfigMap, IntegrationsMessages, TestResult } from "./types";
import { ChevronIcon, TestResultBox } from "./common";

interface K8sSectionProps {
  configs: ConfigMap;
  onSaved: () => void;
  t: IntegrationsMessages;
}

export function K8sSection({ configs, onSaved, t }: K8sSectionProps) {
  const tk = t.k8s;

  const [apiServer, setApiServer] = useState("");
  const [token, setToken] = useState("");
  const [dirty, setDirty] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<{ ok: boolean; msg: string } | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const k8sConfigs = configs.K8S ?? [];
    setApiServer(k8sConfigs.find(c => c.key === "api-server")?.value ?? "");
    setToken(""); // 민감값 — 항상 비워서 표시
    setDirty(false);
    setTestResult(null);
    setSavedMsg(null);
  }, [configs]);

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/configs/k8s/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiServer, token }),
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
      const entries = [
        { key: "api-server", value: apiServer, sensitive: false },
        ...(token ? [{ key: "token", value: token, sensitive: true }] : []),
      ];
      for (const entry of entries) {
        const res = await fetch("/api/admin/configs", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category: "K8S", ...entry, description: null }),
        });
        if (!res.ok) throw new Error((await res.json()).message ?? "Save failed");
      }
      setSavedMsg({ ok: true, msg: tk.savedOk });
      setDirty(false);
      onSaved();
    } catch (e) {
      setSavedMsg({ ok: false, msg: e instanceof Error ? e.message : tk.saveFailed });
    } finally {
      setSaving(false);
    }
  }

  const canTest = !!apiServer && (!!token || !!(configs.K8S?.find(c => c.key === "token")?.value));

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <div
        className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between cursor-pointer select-none hover:bg-gray-100"
        onClick={() => setCollapsed(v => !v)}
      >
        <div className="flex items-center gap-2">
          <ChevronIcon collapsed={collapsed} />
          <span className="text-sm font-semibold text-gray-900">{tk.title}</span>
          <span className="text-xs text-gray-500">{tk.description}</span>
          {dirty && <span className="text-xs text-orange-500 font-medium">{t.iam.unsaved}</span>}
        </div>
        <span className="text-xs text-gray-400">K8S</span>
      </div>

      {!collapsed && (
        <div className="p-4">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1">{tk.apiServerLabel}</label>
              <input
                className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs font-mono bg-white focus:outline-none focus:ring-1 focus:ring-blue-300"
                placeholder={tk.apiServerPlaceholder}
                value={apiServer}
                onChange={e => { setApiServer(e.target.value); setDirty(true); setTestResult(null); }}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">{tk.tokenLabel}</label>
              <input
                type="password"
                className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs font-mono bg-white focus:outline-none focus:ring-1 focus:ring-blue-300"
                placeholder={tk.tokenPlaceholder}
                value={token}
                onChange={e => { setToken(e.target.value); setDirty(true); setTestResult(null); }}
              />
            </div>
          </div>

          {testResult && (
            <TestResultBox result={testResult} passedMsg={tk.testPassed} failedMsg={tk.testFailed} />
          )}

          {savedMsg && (
            <p className={`text-xs mb-3 ${savedMsg.ok ? "text-green-700" : "text-red-600"}`}>
              {savedMsg.ok ? `✓ ${savedMsg.msg}` : `✗ ${savedMsg.msg}`}
            </p>
          )}

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTest}
              disabled={testing || !canTest}
            >
              {testing ? tk.testing : tk.testBtn}
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleSave}
              disabled={saving || !dirty}
            >
              {saving ? tk.saving : tk.saveBtn}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
