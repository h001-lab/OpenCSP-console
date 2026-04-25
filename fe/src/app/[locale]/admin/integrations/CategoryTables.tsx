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

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid var(--border-1)",
  borderRadius: "var(--r-xs)",
  padding: "4px 8px",
  fontSize: "12px",
  fontFamily: "var(--font-mono)",
  background: "var(--bg-surface)",
  color: "var(--fg-primary)",
  outline: "none",
  boxSizing: "border-box",
};

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
          <div key={category} style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-1)",
            borderRadius: "var(--r-md)",
            overflow: "hidden",
          }}>
            <div
              style={{
                padding: "10px 16px",
                borderBottom: isCollapsed ? "none" : "1px solid var(--border-1)",
                background: "var(--bg-subtle)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
                userSelect: "none",
              }}
              onClick={() => onToggle(category)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <ChevronIcon collapsed={isCollapsed} />
                <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--fg-primary)" }}>{meta.title}</span>
                <span style={{ fontSize: "11px", color: "var(--fg-muted)" }}>{t.descriptions[category]}</span>
              </div>
              <span style={{ fontSize: "11px", color: "var(--fg-disabled)", fontFamily: "var(--font-mono)" }}>{category}</span>
            </div>

            {!isCollapsed && (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-1)", background: "var(--bg-subtle)" }}>
                    <th style={{ textAlign: "left", padding: "6px 16px", fontSize: "11px", fontWeight: 500, color: "var(--fg-muted)", width: 192 }}>{t.columns.key}</th>
                    <th style={{ textAlign: "left", padding: "6px 16px", fontSize: "11px", fontWeight: 500, color: "var(--fg-muted)" }}>{t.columns.value}</th>
                    <th style={{ textAlign: "left", padding: "6px 16px", fontSize: "11px", fontWeight: 500, color: "var(--fg-muted)", width: 64 }}>{t.columns.source}</th>
                    <th style={{ padding: "6px 16px", width: 112 }} />
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
                      <tr key={field.key} style={{ borderBottom: "1px solid var(--border-1)" }}>
                        <td style={{ padding: "8px 16px", color: "var(--fg-secondary)", fontFamily: "var(--font-mono)", fontSize: "12px", whiteSpace: "nowrap" }}>
                          {field.key}
                          {field.description && <div style={{ color: "var(--fg-disabled)", fontFamily: "var(--font-sans)", marginTop: 2 }}>{field.description}</div>}
                        </td>
                        <td style={{ padding: "8px 16px" }}>
                          {isEditing ? (
                            field.type === "textarea" ? (
                              <textarea
                                style={{ ...inputStyle, resize: "none" }}
                                rows={3}
                                value={editValue}
                                onChange={(e) => onEditValueChange(e.target.value)}
                                placeholder={field.sensitive ? t.sensitivePlaceholder : ""}
                              />
                            ) : (
                              <input
                                type={field.sensitive ? "password" : "text"}
                                style={inputStyle}
                                value={editValue}
                                onChange={(e) => onEditValueChange(e.target.value)}
                                placeholder={field.sensitive ? t.sensitivePlaceholder : ""}
                                autoFocus
                              />
                            )
                          ) : (
                            <span style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: "12px",
                              color: !currentVal ? "var(--fg-disabled)" : "var(--fg-secondary)",
                              fontStyle: !currentVal ? "italic" : "normal",
                            }}>
                              {currentVal || "—"}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "8px 16px" }}>
                          <span style={{
                            fontSize: "11px",
                            padding: "2px 6px",
                            borderRadius: "var(--r-xs)",
                            background: fromDb ? "var(--info-50)" : "var(--bg-subtle)",
                            color: fromDb ? "var(--info-600)" : "var(--fg-muted)",
                            border: `1px solid ${fromDb ? "var(--brand-100)" : "var(--border-1)"}`,
                          }}>
                            {fromDb ? "DB" : "env"}
                          </span>
                        </td>
                        <td style={{ padding: "8px 16px" }}>
                          {isEditing ? (
                            <div style={{ display: "flex", gap: 4 }}>
                              <Button variant="default" size="sm"
                                onClick={() => onSaveEdit(category, field)} disabled={saving}>
                                {saving ? t.actions.saving : t.actions.save}
                              </Button>
                              <button
                                style={{ fontSize: "12px", padding: "2px 8px", color: "var(--fg-muted)", background: "none", border: "none", cursor: "pointer" }}
                                onClick={onCancelEdit}>
                                {t.actions.cancel}
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: "flex", gap: 4 }}>
                              <button
                                style={{ fontSize: "12px", color: "var(--brand-600)", background: "none", border: "none", cursor: "pointer", padding: "2px 4px" }}
                                onClick={() => onStartEdit(category, field)}>
                                {t.actions.edit}
                              </button>
                              {fromDb && (
                                <button
                                  style={{ fontSize: "12px", color: "var(--danger-600)", background: "none", border: "none", cursor: "pointer", padding: "2px 4px", marginLeft: 4 }}
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
