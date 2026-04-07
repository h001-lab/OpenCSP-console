"use client";

import { Button } from "@h001/ui";
import { ConfigCategory, ConfigMap, FieldMeta, IntegrationsMessages } from "./types";
import { ChevronIcon } from "./common";

export const INTEGRATION_FIELDS: Partial<Record<ConfigCategory, { title: string; fields: FieldMeta[] }>> = {
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
  PROVISION: {
    title: "Provisioning",
    fields: [
      { key: "history-retention-days", label: "History Retention Days", description: "Days to keep provision history (0 = disabled)" },
    ],
  },
  GENERAL: {
    title: "General",
    fields: [
      { key: "banner.message", label: "Banner Message" },
      { key: "banner.link",    label: "Banner Link" },
    ],
  },
};

export const CORE_CATEGORIES: ConfigCategory[] = ["K8S", "PROVISION"];
export const CONSOLE_CATEGORIES: ConfigCategory[] = ["AI", "GENERAL"];

interface CategoryTableProps {
  categories: ConfigCategory[];
  configs: ConfigMap;
  t: IntegrationsMessages;
  collapsed: Record<string, boolean>;
  onToggle: (category: string) => void;
  editingKey: string | null;
  editValue: string;
  saving: boolean;
  onStartEdit: (category: ConfigCategory, field: FieldMeta) => void;
  onSaveEdit: (category: ConfigCategory, field: FieldMeta) => void;
  onCancelEdit: () => void;
  onEditValueChange: (v: string) => void;
  onDelete: (category: ConfigCategory, key: string) => void;
}

export function CategoryTables({
  categories, configs, t, collapsed, onToggle,
  editingKey, editValue, saving,
  onStartEdit, onSaveEdit, onCancelEdit, onEditValueChange, onDelete,
}: CategoryTableProps) {
  return (
    <>
      {categories.map((category) => {
        const meta = INTEGRATION_FIELDS[category];
        if (!meta) return null;

        const existingKeys = new Set((configs[category] ?? []).map((c) => c.key));
        const hiddenKeys = category === "GENERAL"
          ? new Set(["iam.provider", "pam.provider"])
          : new Set<string>();
        const extraEntries = (configs[category] ?? []).filter(
          (c) => !meta.fields.some((f) => f.key === c.key) && !hiddenKeys.has(c.key)
        );
        const isCollapsed = collapsed[category] ?? false;

        return (
          <div key={category} className="bg-white rounded-lg border overflow-hidden">
            <div
              className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between cursor-pointer select-none hover:bg-gray-100"
              onClick={() => onToggle(category)}
            >
              <div className="flex items-center gap-2">
                <ChevronIcon collapsed={isCollapsed} />
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
                    const currentVal = configs[category]?.find((c) => c.key === field.key)?.value ?? "";

                    return (
                      <tr key={field.key} className="border-b last:border-b-0 hover:bg-gray-50/50">
                        <td className="px-4 py-2.5 text-gray-700 font-mono text-xs whitespace-nowrap">
                          {field.key}
                          {field.description && <div className="text-gray-400 font-sans">{field.description}</div>}
                        </td>
                        <td className="px-4 py-2.5">
                          {isEditing ? (
                            field.type === "textarea" ? (
                              <textarea
                                className="w-full border rounded px-2 py-1 text-xs font-mono resize-none"
                                rows={3}
                                value={editValue}
                                onChange={(e) => onEditValueChange(e.target.value)}
                                placeholder={field.sensitive ? t.sensitivePlaceholder : ""}
                              />
                            ) : (
                              <input
                                type={field.sensitive ? "password" : "text"}
                                className="w-full border rounded px-2 py-1 text-xs font-mono"
                                value={editValue}
                                onChange={(e) => onEditValueChange(e.target.value)}
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
                              <Button variant="default" className="text-xs px-2 py-1"
                                onClick={() => onSaveEdit(category, field)} disabled={saving}>
                                {saving ? t.actions.saving : t.actions.save}
                              </Button>
                              <button className="text-xs px-2 py-1 text-gray-500 hover:text-gray-700"
                                onClick={onCancelEdit}>
                                {t.actions.cancel}
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-1">
                              <button className="text-xs text-blue-600 hover:underline"
                                onClick={() => onStartEdit(category, field)}>
                                {t.actions.edit}
                              </button>
                              {fromDb && (
                                <button className="text-xs text-red-400 hover:underline ml-1"
                                  onClick={() => onDelete(category, field.key)}>
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
    </>
  );
}
