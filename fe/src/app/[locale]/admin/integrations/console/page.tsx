"use client";

import { useEffect } from "react";
import { useTypedMsg } from "@/hooks/useTypedMsg";
import { useConfigs } from "@/hooks/useConfigs";
import { BackendSection } from "../BackendSection";
import { CategoryTables, CONSOLE_CATEGORIES } from "../CategoryTables";
import { IntegrationsMessages } from "../types";

export default function ConsolePage() {
  const adminMsg = useTypedMsg<{ integrations: IntegrationsMessages }>("Admin");
  const t = adminMsg?.integrations;

  const cfg = useConfigs(t?.saveFailed ?? "", t?.deleteConfirm ?? "");
  const { fetchConfigs } = cfg;

  useEffect(() => { fetchConfigs(); }, [fetchConfigs]);

  if (!t) return null;

  if (cfg.loading) return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      <span className="ml-3 text-sm text-gray-600">{t.loading}</span>
    </div>
  );

  if (cfg.error) return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{cfg.error}</div>
  );

  return (
    <div className="flex flex-col gap-4">
      <BackendSection t={t} />
      <CategoryTables
        configs={cfg.configs} t={t} collapsed={cfg.collapsed} onToggle={cfg.toggleCollapsed}
        editingKey={cfg.editingKey} editValue={cfg.editValue} saving={cfg.saving}
        onStartEdit={cfg.startEdit} onSaveEdit={cfg.saveEdit}
        onCancelEdit={cfg.cancelEdit} onEditValueChange={cfg.setEditValue}
        onDelete={cfg.deleteConfig}
        categories={CONSOLE_CATEGORIES}
      />
    </div>
  );
}
