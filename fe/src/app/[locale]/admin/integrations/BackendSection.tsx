"use client";

import { useEffect, useState } from "react";
import { Button } from "@h001/ui";
import { IntegrationsMessages } from "./types";
import { ChevronIcon } from "./common";

interface BackendSectionProps {
  t: IntegrationsMessages;
}

export function BackendSection({ t }: BackendSectionProps) {
  const tb = t.backend;

  const [url, setUrl] = useState("");
  const [envDefault, setEnvDefault] = useState("");
  const [saved, setSaved] = useState("");
  const [dirty, setDirty] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<{ ok: boolean; msg: string } | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    fetch("/api/admin/backend")
      .then(r => r.json())
      .then(d => {
        setUrl(d.url ?? "");
        setSaved(d.url ?? "");
        setEnvDefault(d.envDefault ?? "");
      })
      .catch(() => {});
  }, []);

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/backend/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      setTestResult(await res.json());
    } catch {
      setTestResult({ success: false, message: "Request failed" });
    } finally {
      setTesting(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setSavedMsg(null);
    try {
      const res = await fetch("/api/admin/backend", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Save failed");
      setSaved(url);
      setDirty(false);
      setSavedMsg({ ok: true, msg: tb.savedOk });
    } catch (e) {
      setSavedMsg({ ok: false, msg: e instanceof Error ? e.message : tb.saveFailed });
    } finally {
      setSaving(false);
    }
  }

  const isEnvValue = url === envDefault;

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <div
        className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between cursor-pointer select-none hover:bg-gray-100"
        onClick={() => setCollapsed(v => !v)}
      >
        <div className="flex items-center gap-2">
          <ChevronIcon collapsed={collapsed} />
          <span className="text-sm font-semibold text-gray-900">{tb.title}</span>
          <span className="text-xs text-gray-500">{tb.description}</span>
          {dirty && <span className="text-xs text-orange-500 font-medium">{t.iam.unsaved}</span>}
        </div>
        <span className="text-xs font-mono text-gray-400 truncate max-w-48">{saved}</span>
      </div>

      {!collapsed && (
        <div className="p-4">
          <div className="mb-4">
            <label className="text-xs text-gray-500 block mb-1">{tb.urlLabel}</label>
            <input
              className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs font-mono bg-white focus:outline-none focus:ring-1 focus:ring-blue-300"
              placeholder={tb.urlPlaceholder}
              value={url}
              onChange={e => { setUrl(e.target.value); setDirty(true); setTestResult(null); setSavedMsg(null); }}
            />
            {isEnvValue && (
              <p className="text-[10px] text-gray-400 mt-1">{tb.envHint}</p>
            )}
          </div>

          {testResult && (
            <div className={`rounded-md p-2.5 text-xs mb-3 border ${testResult.success
              ? "bg-green-50 border-green-200"
              : "bg-red-50 border-red-200"}`}>
              <p className={`font-semibold ${testResult.success ? "text-green-800" : "text-red-800"}`}>
                {testResult.success ? `✓ ${tb.testPassed}` : `✗ ${tb.testFailed}`}
              </p>
              <p className={testResult.success ? "text-green-700" : "text-red-700"}>{testResult.message}</p>
            </div>
          )}

          {savedMsg && (
            <p className={`text-xs mb-3 ${savedMsg.ok ? "text-green-700" : "text-red-600"}`}>
              {savedMsg.ok ? `✓ ${savedMsg.msg}` : `✗ ${savedMsg.msg}`}
            </p>
          )}

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleTest} disabled={testing || !url.trim()}>
              {testing ? tb.testing : tb.testBtn}
            </Button>
            <Button variant="default" size="sm" onClick={handleSave} disabled={saving || !dirty || !url.trim()}>
              {saving ? tb.saving : tb.saveBtn}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
