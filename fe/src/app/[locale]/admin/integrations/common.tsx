import { FieldMeta, TestResult } from "./types";

export function ChevronIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      style={{
        width: 16,
        height: 16,
        color: "var(--fg-muted)",
        flexShrink: 0,
        transition: "transform 200ms ease",
        transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)",
      }}
      fill="none" viewBox="0 0 24 24" stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

export function TestResultBox({ result, passedMsg, failedMsg }: { result: TestResult; passedMsg: string; failedMsg: string }) {
  const isOk = result.success;
  return (
    <div style={{
      borderRadius: "var(--r-sm)",
      padding: "10px 12px",
      marginBottom: 12,
      fontSize: "12px",
      background: isOk ? "var(--ok-50)" : "var(--danger-50)",
      border: `1px solid ${isOk ? "var(--ok-50)" : "var(--danger-50)"}`,
    }}>
      <p style={{ fontWeight: 600, marginBottom: 4, color: isOk ? "var(--ok-600)" : "var(--danger-600)" }}>
        {isOk ? `✓ ${passedMsg}` : `✗ ${failedMsg}`}
      </p>
      {result.steps.map((step, i) => (
        <p key={i} style={{ margin: "1px 0", color: step.success ? "var(--ok-600)" : "var(--danger-600)" }}>
          {step.success ? "✓" : "✗"} <span style={{ fontWeight: 500 }}>{step.name}:</span> {step.message}
        </p>
      ))}
    </div>
  );
}

export function FieldTable({
  fields,
  fieldValues,
  onChange,
  keyColLabel,
  valueColLabel,
  unchangedHint,
}: {
  fields: FieldMeta[];
  fieldValues: Record<string, string>;
  onChange: (key: string, value: string) => void;
  keyColLabel: string;
  valueColLabel: string;
  unchangedHint: string;
}) {
  if (fields.length === 0) return null;
  return (
    <div style={{
      border: "1px solid var(--border-1)",
      borderRadius: "var(--r-sm)",
      overflow: "hidden",
      marginBottom: 16,
    }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border-1)", background: "var(--bg-subtle)" }}>
            <th style={{ textAlign: "left", padding: "6px 16px", fontSize: "11px", fontWeight: 500, color: "var(--fg-muted)", width: 192 }}>{keyColLabel}</th>
            <th style={{ textAlign: "left", padding: "6px 16px", fontSize: "11px", fontWeight: 500, color: "var(--fg-muted)" }}>{valueColLabel}</th>
          </tr>
        </thead>
        <tbody>
          {fields.map((field) => {
            const val = fieldValues[field.key] ?? "";
            const isUnchanged = field.sensitive && val === "****";
            return (
              <tr key={field.key} style={{ borderBottom: "1px solid var(--border-1)" }}>
                <td style={{ padding: "8px 16px", color: "var(--fg-secondary)", fontFamily: "var(--font-mono)", fontSize: "12px", whiteSpace: "nowrap" }}>
                  {field.key}
                  {field.description && <div style={{ color: "var(--fg-disabled)", fontFamily: "var(--font-sans)", marginTop: 2 }}>{field.description}</div>}
                </td>
                <td style={{ padding: "8px 16px" }}>
                  <input
                    type={field.sensitive ? "password" : "text"}
                    style={{
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
                    }}
                    value={isUnchanged ? "" : val}
                    placeholder={isUnchanged ? unchangedHint : ""}
                    onChange={(e) => onChange(field.key, e.target.value)}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
