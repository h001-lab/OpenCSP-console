"use client";

import { useEffect } from "react";
import { useTypedMsg } from "@/hooks/useTypedMsg";
import { useConfigs } from "@/hooks/useConfigs";
import { IamConfigSection } from "../IamSection";
import { PamConfigSection } from "../PamSection";
import { SemaphoreConfigSection } from "../SemaphoreSection";
import { K8sSection } from "../K8sSection";
import { BillingConfigSection } from "../BillingSection";
import { CategoryTables, CORE_CATEGORIES } from "../CategoryTables";
import { IntegrationsMessages } from "../types";

export default function CorePage() {
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

  if (cfg.backendUnreachable) return (
    <div className="flex flex-col gap-4">
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <p className="text-sm font-semibold text-orange-800 mb-1">Backend unreachable</p>
        <p className="text-xs text-orange-700">
          Could not connect to the backend. Configure the Kubernetes API server below to bring the cluster online.
        </p>
      </div>
      <K8sSection configs={cfg.configs} onSaved={cfg.fetchConfigs} t={t} />
    </div>
  );

  if (cfg.error) return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{cfg.error}</div>
  );

  const tableProps = {
    configs: cfg.configs, t, collapsed: cfg.collapsed, onToggle: cfg.toggleCollapsed,
    editingKey: cfg.editingKey, editValue: cfg.editValue, saving: cfg.saving,
    onStartEdit: cfg.startEdit, onSaveEdit: cfg.saveEdit,
    onCancelEdit: cfg.cancelEdit, onEditValueChange: cfg.setEditValue,
    onDelete: cfg.deleteConfig,
  };

  return (
    <div className="flex flex-col gap-4">
      <IamConfigSection configs={cfg.configs} onSaved={cfg.fetchConfigs} t={t} />
      <PamConfigSection configs={cfg.configs} onSaved={cfg.fetchConfigs} t={t} />
      <K8sSection configs={cfg.configs} onSaved={cfg.fetchConfigs} t={t} />
      <BillingConfigSection configs={cfg.configs} onSaved={cfg.fetchConfigs} t={t} />
      <CategoryTables {...tableProps} categories={CORE_CATEGORIES} />
      <SemaphoreConfigSection configs={cfg.configs} onSaved={cfg.fetchConfigs} t={t} />
    </div>
  );
}
