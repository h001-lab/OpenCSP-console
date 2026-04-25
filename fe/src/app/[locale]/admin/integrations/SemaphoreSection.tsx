"use client";

import { useEffect, useState } from "react";
import { Button } from "@h001/ui";
import { ConfigMap, IntegrationsMessages, TestResult } from "./types";
import { ChevronIcon, FieldTable, TestResultBox } from "./common";

const CONNECTION_FIELDS = [
  { key: "semaphore.url",       label: "URL",       description: "https://semaphore.example.com" },
  { key: "semaphore.api.token", label: "API Token", sensitive: true, type: "password" as const },
];

interface Project { id: number; name: string }
interface Repository { id: number; name: string; gitUrl: string }
interface CreateResult { success: boolean; message: string; id?: number }

interface Props {
  configs: ConfigMap;
  onSaved: () => void;
  t: IntegrationsMessages;
}

export function SemaphoreConfigSection({ configs, onSaved, t }: Props) {
  const ts = t.semaphore;

  // ── 연결 설정 ────────────────────────────────────────────────────────────
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [dirty, setDirty]             = useState(false);
  const [testing, setTesting]         = useState(false);
  const [testResult, setTestResult]   = useState<TestResult | null>(null);
  const [saving, setSaving]           = useState(false);
  const [savedMsg, setSavedMsg]       = useState<{ ok: boolean; msg: string } | null>(null);
  const [collapsed, setCollapsed]     = useState(false);

  // ── 프로젝트 선택 ────────────────────────────────────────────────────────
  const [projects, setProjects]           = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number | "">("");
  const [projectSaving, setProjectSaving] = useState(false);
  const [projectSavedMsg, setProjectSavedMsg] = useState<string | null>(null);

  // ── Repository 선택 ──────────────────────────────────────────────────────
  const [repositories, setRepositories]           = useState<Repository[]>([]);
  const [loadingRepos, setLoadingRepos]           = useState(false);
  const [selectedRepoId, setSelectedRepoId]       = useState<number | "">("");
  const [repoSaving, setRepoSaving]               = useState(false);
  const [repoSavedMsg, setRepoSavedMsg]           = useState<string | null>(null);

  // ── Git Repository ───────────────────────────────────────────────────────
  const [repoForm, setRepoForm]   = useState({ name: "opencsp-core", gitUrl: "", gitBranch: "main", accessToken: "" });
  const [repoResult, setRepoResult] = useState<CreateResult | null>(null);
  const [creatingRepo, setCreatingRepo] = useState(false);

  // ── Playbook 설정 ────────────────────────────────────────────────────────
  const [playbook, setPlaybook]         = useState("");
  const [playbookSaving, setPlaybookSaving] = useState(false);
  const [playbookSavedMsg, setPlaybookSavedMsg] = useState<string | null>(null);

  // ── Environment (Variable Group) 선택 ───────────────────────────────────
  const [environments, setEnvironments]           = useState<{ id: number; name: string }[]>([]);
  const [loadingEnvs, setLoadingEnvs]             = useState(false);
  const [selectedEnvId, setSelectedEnvId]         = useState<number | "">("");
  const [envSaving, setEnvSaving]                 = useState(false);
  const [envSavedMsg, setEnvSavedMsg]             = useState<string | null>(null);

  // ── Variable Group ───────────────────────────────────────────────────────
  const [varGroupName, setVarGroupName] = useState("TELEPORT");
  const [varValues, setVarValues]       = useState<Record<string, string>>({});
  const [varResult, setVarResult]       = useState<CreateResult | null>(null);
  const [creatingVar, setCreatingVar]   = useState(false);

  useEffect(() => {
    const initial: Record<string, string> = {};
    CONNECTION_FIELDS.forEach(f => {
      initial[f.key] = configs.SEMAPHORE?.find(c => c.key === f.key)?.value ?? "";
    });
    setFieldValues(initial);
    setDirty(false);
    setTestResult(null);
    setSavedMsg(null);

    // 저장된 project.id, playbook 초기화
    const pid = configs.SEMAPHORE?.find(c => c.key === "semaphore.project.id")?.value;
    if (pid) setSelectedProjectId(parseInt(pid, 10));
    const rid = configs.SEMAPHORE?.find(c => c.key === "semaphore.repository.id")?.value;
    if (rid) setSelectedRepoId(parseInt(rid, 10));
    const pb = configs.SEMAPHORE?.find(c => c.key === "semaphore.playbook")?.value;
    if (pb) setPlaybook(pb);
    const eid = configs.SEMAPHORE?.find(c => c.key === "semaphore.environment.id")?.value;
    if (eid) setSelectedEnvId(parseInt(eid, 10));
  }, [configs]);

  function handleFieldChange(key: string, value: string) {
    setFieldValues(prev => ({ ...prev, [key]: value }));
    setDirty(true);
    setTestResult(null);
    setSavedMsg(null);
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/configs/semaphore/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: fieldValues["semaphore.url"] ?? "",
          apiToken: fieldValues["semaphore.api.token"] === "****" ? "" : (fieldValues["semaphore.api.token"] ?? ""),
        }),
      });
      const result: TestResult = await res.json();
      setTestResult(result);
      // 테스트 성공 시 프로젝트 자동 로드
      if (result.success) handleLoadProjects();
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
      for (const field of CONNECTION_FIELDS) {
        const value = fieldValues[field.key] ?? "";
        if (field.sensitive && value === "****") continue;
        await fetch("/api/admin/configs", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category: "SEMAPHORE", key: field.key, value, sensitive: field.sensitive ?? false }),
        });
      }
      setSavedMsg({ ok: true, msg: ts.savedOk });
      setDirty(false);
      onSaved();
    } catch {
      setSavedMsg({ ok: false, msg: t.saveFailed });
    } finally {
      setSaving(false);
    }
  }

  async function handleLoadProjects() {
    setLoadingProjects(true);
    setProjectSavedMsg(null);
    try {
      const res = await fetch("/api/admin/configs/semaphore/projects");
      const data = await res.json();
      if (!res.ok) { setProjects([]); return; }
      setProjects(data);
      if (data.length === 1) setSelectedProjectId(data[0].id);
    } finally {
      setLoadingProjects(false);
    }
  }

  async function handleSaveProject() {
    if (!selectedProjectId) return;
    setProjectSaving(true);
    setProjectSavedMsg(null);
    try {
      await fetch("/api/admin/configs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: "SEMAPHORE", key: "semaphore.project.id", value: String(selectedProjectId), sensitive: false }),
      });
      setProjectSavedMsg(ts.savedOk);
      onSaved();
    } finally {
      setProjectSaving(false);
    }
  }

  async function handleLoadRepositories() {
    if (!selectedProjectId) return;
    setLoadingRepos(true);
    setRepoSavedMsg(null);
    try {
      const res = await fetch(`/api/admin/configs/semaphore/repositories?projectId=${selectedProjectId}`);
      const data = await res.json();
      if (!res.ok) { setRepositories([]); return; }
      setRepositories(data);
      if (data.length === 1) setSelectedRepoId(data[0].id);
    } finally {
      setLoadingRepos(false);
    }
  }

  async function handleSaveRepository() {
    if (!selectedRepoId) return;
    setRepoSaving(true);
    setRepoSavedMsg(null);
    try {
      await fetch("/api/admin/configs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: "SEMAPHORE", key: "semaphore.repository.id", value: String(selectedRepoId), sensitive: false }),
      });
      setRepoSavedMsg(ts.savedOk);
      onSaved();
    } finally {
      setRepoSaving(false);
    }
  }

  async function handleSavePlaybook() {
    if (!playbook.trim()) return;
    setPlaybookSaving(true);
    setPlaybookSavedMsg(null);
    try {
      await fetch("/api/admin/configs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: "SEMAPHORE", key: "semaphore.playbook", value: playbook.trim(), sensitive: false }),
      });
      setPlaybookSavedMsg(ts.savedOk);
      onSaved();
    } finally {
      setPlaybookSaving(false);
    }
  }

  async function handleCreateRepo() {
    if (!selectedProjectId || !repoForm.gitUrl) return;
    setCreatingRepo(true);
    setRepoResult(null);
    try {
      const res = await fetch("/api/admin/configs/semaphore/resources?type=repository", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: selectedProjectId, ...repoForm }),
      });
      setRepoResult(await res.json());
    } catch {
      setRepoResult({ success: false, message: ts.createFailed });
    } finally {
      setCreatingRepo(false);
    }
  }

  async function handleLoadEnvironments() {
    if (!selectedProjectId) return;
    setLoadingEnvs(true);
    setEnvSavedMsg(null);
    try {
      const res = await fetch(`/api/admin/configs/semaphore/environments?projectId=${selectedProjectId}`);
      const data = await res.json();
      if (!res.ok) { setEnvironments([]); return; }
      setEnvironments(data);
      if (data.length === 1) setSelectedEnvId(data[0].id);
    } finally {
      setLoadingEnvs(false);
    }
  }

  async function handleSaveEnvironment() {
    if (!selectedEnvId) return;
    setEnvSaving(true);
    setEnvSavedMsg(null);
    try {
      await fetch("/api/admin/configs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: "SEMAPHORE", key: "semaphore.environment.id", value: String(selectedEnvId), sensitive: false }),
      });
      setEnvSavedMsg(ts.savedOk);
      onSaved();
    } finally {
      setEnvSaving(false);
    }
  }

  async function handleCreateVarGroup() {
    if (!selectedProjectId) return;
    setCreatingVar(true);
    setVarResult(null);
    try {
      const res = await fetch("/api/admin/configs/semaphore/resources?type=variable-group", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: selectedProjectId, name: varGroupName, variables: varValues }),
      });
      const result: CreateResult = await res.json();
      setVarResult(result);
      // 생성/기존 environment ID를 selectedEnvId에 반영 (BE가 자동 저장)
      if (result.success && result.id) {
        setSelectedEnvId(result.id);
        onSaved();
      }
    } catch {
      setVarResult({ success: false, message: ts.createFailed });
    } finally {
      setCreatingVar(false);
    }
  }

  const projectSelected = selectedProjectId !== "";

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      {/* 헤더 */}
      <div
        className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between cursor-pointer select-none hover:bg-gray-100"
        onClick={() => setCollapsed(v => !v)}
      >
        <div className="flex items-center gap-2">
          <ChevronIcon collapsed={collapsed} />
          <span className="text-sm font-semibold text-gray-900">Semaphore</span>
          <span className="text-xs text-gray-500">{t.descriptions["SEMAPHORE"]}</span>
          {dirty && (
            <span className="text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 px-1.5 py-0.5 rounded">
              {ts.unsaved}
            </span>
          )}
        </div>
        <span className="text-xs text-gray-400">SEMAPHORE</span>
      </div>

      {!collapsed && (
        <div className="p-4 flex flex-col gap-5">

          {/* ── 1. 연결 설정 ─────────────────────────────────────── */}
          <div>
            <FieldTable
              fields={CONNECTION_FIELDS}
              fieldValues={fieldValues}
              onChange={handleFieldChange}
              keyColLabel={t.columns.key}
              valueColLabel={t.columns.value}
              unchangedHint={ts.unchangedHint}
            />
            {testResult && <TestResultBox result={testResult} passedMsg={ts.testPassed} failedMsg={ts.testFailed} />}
            {savedMsg && (
              <p className={`text-xs mt-2 ${savedMsg.ok ? "text-green-700" : "text-red-600"}`}>
                {savedMsg.ok ? `✓ ${savedMsg.msg}` : `✗ ${savedMsg.msg}`}
              </p>
            )}
            <div className="flex gap-2 mt-3">
              <Button variant="default" className="text-xs px-3 py-1.5" onClick={handleTest} disabled={testing || saving}>
                {testing ? ts.testing : ts.testBtn}
              </Button>
              <Button variant="default" className="text-xs px-3 py-1.5" onClick={handleSave} disabled={saving || testing}>
                {saving ? ts.saving : ts.saveBtn}
              </Button>
            </div>
          </div>

          {/* ── 2. 프로젝트 선택 ──────────────────────────────────── */}
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-gray-700">{ts.projectLabel}</span>
              {/* DB에 저장된 현재 project.id 표시 */}
              {selectedProjectId !== "" && projects.length === 0 && (
                <span className="text-xs px-2 py-0.5 rounded border bg-blue-50 text-blue-700 border-blue-200 font-mono">
                  id: {selectedProjectId}
                </span>
              )}
              <Button variant="outline" size="sm" onClick={handleLoadProjects} disabled={loadingProjects}>
                {loadingProjects ? ts.loadingProjects : ts.loadProjectsBtn}
              </Button>
            </div>
            {projects.length > 0 && (
              <div className="flex items-center gap-2">
                <select
                  className="border rounded px-2 py-1.5 text-xs flex-1 max-w-xs focus:outline-none focus:ring-1 focus:ring-blue-300"
                  value={selectedProjectId}
                  onChange={e => { setSelectedProjectId(Number(e.target.value)); setProjectSavedMsg(null); }}
                >
                  <option value="">{ts.projectPlaceholder}</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name} (id: {p.id})</option>)}
                </select>
                <button
                  className="text-xs px-2.5 py-1.5 rounded border font-medium text-white disabled:opacity-50"
                  style={{ backgroundColor: "#2563eb", borderColor: "#1d4ed8" }}
                  onClick={handleSaveProject}
                  disabled={!selectedProjectId || projectSaving}
                >
                  {projectSaving ? ts.saving : ts.saveBtn}
                </button>
                {projectSavedMsg && <span className="text-xs text-green-700">✓ {projectSavedMsg}</span>}
              </div>
            )}
          </div>

          {/* ── 3. Repository 선택 ───────────────────────────────── */}
          <div className={`border-t pt-4 ${!projectSelected ? "opacity-40 pointer-events-none" : ""}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-gray-700">{ts.repoSection}</span>
              {selectedRepoId !== "" && repositories.length === 0 && (
                <span className="text-xs px-2 py-0.5 rounded border bg-blue-50 text-blue-700 border-blue-200 font-mono">
                  id: {selectedRepoId}
                </span>
              )}
              <Button variant="outline" size="sm" onClick={handleLoadRepositories} disabled={loadingRepos}>
                {loadingRepos ? ts.loadingProjects : ts.loadProjectsBtn}
              </Button>
            </div>
            {repositories.length > 0 && (
              <div className="flex items-center gap-2">
                <select
                  className="border rounded px-2 py-1.5 text-xs flex-1 max-w-xs focus:outline-none focus:ring-1 focus:ring-blue-300"
                  value={selectedRepoId}
                  onChange={e => { setSelectedRepoId(Number(e.target.value)); setRepoSavedMsg(null); }}
                >
                  <option value="">{ts.projectPlaceholder}</option>
                  {repositories.map(r => (
                    <option key={r.id} value={r.id}>{r.name} (id: {r.id})</option>
                  ))}
                </select>
                <button
                  className="text-xs px-2.5 py-1.5 rounded border font-medium text-white disabled:opacity-50"
                  style={{ backgroundColor: "#2563eb", borderColor: "#1d4ed8" }}
                  onClick={handleSaveRepository}
                  disabled={!selectedRepoId || repoSaving}
                >
                  {repoSaving ? ts.saving : ts.saveBtn}
                </button>
                {repoSavedMsg && <span className="text-xs text-green-700">✓ {repoSavedMsg}</span>}
              </div>
            )}
          </div>

          {/* ── 3-1. Git Repository 생성 ──────────────────────────── */}
          <div className={`border-t pt-4 ${!projectSelected ? "opacity-40 pointer-events-none" : ""}`}>
            <p className="text-xs font-semibold text-gray-700 mb-3">{ts.repoSection}</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              {[
                { field: "name",        label: ts.repoName,   placeholder: "e.g. opencsp-core" },
                { field: "gitUrl",      label: ts.repoUrl,    placeholder: "https://github.com/org/repo.git" },
                { field: "gitBranch",   label: ts.repoBranch, placeholder: "main" },
                { field: "accessToken", label: ts.repoToken,  placeholder: ts.repoTokenHint, type: "password" },
              ].map(({ field, label, placeholder, type }) => (
                <div key={field}>
                  <label className="text-xs text-gray-500 block mb-1">{label}</label>
                  <input
                    type={type ?? "text"}
                    className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs font-mono bg-white focus:outline-none focus:ring-1 focus:ring-blue-300"
                    placeholder={placeholder}
                    value={(repoForm as Record<string, string>)[field]}
                    onChange={e => setRepoForm(p => ({ ...p, [field]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            {repoResult && (
              <p className={`text-xs mb-2 ${repoResult.success ? "text-green-700" : "text-red-600"}`}>
                {repoResult.success ? `✓ ${repoResult.message}` : `✗ ${repoResult.message}`}
              </p>
            )}
            <button
              className="text-xs px-3 py-1.5 rounded border font-medium text-white disabled:opacity-50"
              style={{ backgroundColor: "#2563eb", borderColor: "#1d4ed8" }}
              onClick={handleCreateRepo}
              disabled={creatingRepo || !repoForm.gitUrl}
            >
              {creatingRepo ? ts.creating : ts.createBtn}
            </button>
          </div>

          {/* ── 4. Playbook ───────────────────────────────────────── */}
          <div className={`border-t pt-4 ${!projectSelected ? "opacity-40 pointer-events-none" : ""}`}>
            <p className="text-xs font-semibold text-gray-700 mb-2">{ts.playbookSection}</p>
            <p className="text-xs text-gray-500 mb-3">{ts.playbookDesc}</p>
            <div className="flex items-center gap-2">
              <input
                className="border border-gray-200 rounded px-2.5 py-1.5 text-xs font-mono bg-white focus:outline-none focus:ring-1 focus:ring-blue-300 w-64"
                placeholder="e.g. site.yml"
                value={playbook}
                onChange={e => { setPlaybook(e.target.value); setPlaybookSavedMsg(null); }}
              />
              <button
                className="text-xs px-2.5 py-1.5 rounded border font-medium text-white disabled:opacity-50"
                style={{ backgroundColor: "#2563eb", borderColor: "#1d4ed8" }}
                onClick={handleSavePlaybook}
                disabled={playbookSaving || !playbook.trim()}
              >
                {playbookSaving ? ts.saving : ts.saveBtn}
              </button>
              {playbookSavedMsg && <span className="text-xs text-green-700">✓ {playbookSavedMsg}</span>}
            </div>
          </div>

          {/* ── 5. Environment (Variable Group) 선택 ────────────── */}
          <div className={`border-t pt-4 ${!projectSelected ? "opacity-40 pointer-events-none" : ""}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-gray-700">{ts.envSection}</span>
              {selectedEnvId !== "" && environments.length === 0 && (
                <span className="text-xs px-2 py-0.5 rounded border bg-blue-50 text-blue-700 border-blue-200 font-mono">
                  id: {selectedEnvId}
                </span>
              )}
              <Button variant="outline" size="sm" onClick={handleLoadEnvironments} disabled={loadingEnvs}>
                {loadingEnvs ? ts.loadingProjects : ts.loadEnvsBtn}
              </Button>
            </div>
            {environments.length > 0 && (
              <div className="flex items-center gap-2">
                <select
                  className="border rounded px-2 py-1.5 text-xs flex-1 max-w-xs focus:outline-none focus:ring-1 focus:ring-blue-300"
                  value={selectedEnvId}
                  onChange={e => { setSelectedEnvId(Number(e.target.value)); setEnvSavedMsg(null); }}
                >
                  <option value="">{ts.envPlaceholder}</option>
                  {environments.map(env => (
                    <option key={env.id} value={env.id}>{env.name} (id: {env.id})</option>
                  ))}
                </select>
                <button
                  className="text-xs px-2.5 py-1.5 rounded border font-medium text-white disabled:opacity-50"
                  style={{ backgroundColor: "#2563eb", borderColor: "#1d4ed8" }}
                  onClick={handleSaveEnvironment}
                  disabled={!selectedEnvId || envSaving}
                >
                  {envSaving ? ts.saving : ts.saveBtn}
                </button>
                {envSavedMsg && <span className="text-xs text-green-700">✓ {envSavedMsg}</span>}
              </div>
            )}
          </div>

          {/* ── 6. Variable Group 생성 ────────────────────────────── */}
          <div className={`border-t pt-4 ${!projectSelected ? "opacity-40 pointer-events-none" : ""}`}>
            <p className="text-xs font-semibold text-gray-700 mb-3">{ts.varGroupSection}</p>
            <div className="mb-3">
              <label className="text-xs text-gray-500 block mb-1">{ts.varGroupName}</label>
              <input
                className="w-full max-w-xs border border-gray-200 rounded px-2.5 py-1.5 text-xs font-mono bg-white focus:outline-none focus:ring-1 focus:ring-blue-300"
                value={varGroupName}
                onChange={e => setVarGroupName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              {ts.varKeys.map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="text-xs text-gray-500 block mb-1">{label} <span className="font-mono text-gray-400">({key})</span></label>
                  <input
                    className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs font-mono bg-white focus:outline-none focus:ring-1 focus:ring-blue-300"
                    placeholder={placeholder}
                    value={varValues[key] ?? ""}
                    onChange={e => setVarValues(p => ({ ...p, [key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            {varResult && (
              <p className={`text-xs mb-2 ${varResult.success ? "text-green-700" : "text-red-600"}`}>
                {varResult.success ? `✓ ${varResult.message}` : `✗ ${varResult.message}`}
              </p>
            )}
            <button
              className="text-xs px-3 py-1.5 rounded border font-medium text-white disabled:opacity-50"
              style={{ backgroundColor: "#2563eb", borderColor: "#1d4ed8" }}
              onClick={handleCreateVarGroup}
              disabled={creatingVar}
            >
              {creatingVar ? ts.creating : ts.createBtn}
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
