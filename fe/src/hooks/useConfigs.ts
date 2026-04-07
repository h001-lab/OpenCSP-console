"use client";

import { useCallback, useState } from "react";
import { ConfigCategory, ConfigMap, FieldMeta } from "@/app/[locale]/admin/integrations/types";

export function useConfigs(saveFailed: string, deleteConfirm: string) {
  const [configs, setConfigs] = useState<ConfigMap>({} as ConfigMap);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [backendUnreachable, setBackendUnreachable] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const fetchConfigs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setBackendUnreachable(false);
      const res = await fetch("/api/admin/configs");
      const json = await res.json();
      if (res.status === 503 && json.code === "BACKEND_UNREACHABLE") {
        setBackendUnreachable(true);
        return;
      }
      if (!res.ok) throw new Error(json.error ?? "Failed to fetch");
      setConfigs(json.data ?? json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  function startEdit(category: ConfigCategory, field: FieldMeta) {
    setEditingKey(`${category}.${field.key}`);
    const current = configs[category]?.find((c) => c.key === field.key)?.value ?? "";
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
      alert(e instanceof Error ? e.message : saveFailed);
    } finally {
      setSaving(false);
    }
  }

  async function deleteConfig(category: ConfigCategory, key: string) {
    if (!confirm(deleteConfirm.replace("{key}", key))) return;
    await fetch(`/api/admin/configs/${category}/${encodeURIComponent(key)}`, { method: "DELETE" });
    await fetchConfigs();
  }

  function toggleCollapsed(category: string) {
    setCollapsed((prev) => ({ ...prev, [category]: !(prev[category] ?? false) }));
  }

  return {
    configs, loading, error, backendUnreachable, editingKey, editValue, saving, collapsed,
    fetchConfigs,
    startEdit, saveEdit, deleteConfig,
    cancelEdit: () => setEditingKey(null),
    setEditValue,
    toggleCollapsed,
  };
}
