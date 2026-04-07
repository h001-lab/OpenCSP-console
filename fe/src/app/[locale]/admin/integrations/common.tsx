import { FieldMeta, TestResult } from "./types";

export function ChevronIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      className={`h-4 w-4 text-gray-400 transition-transform ${collapsed ? "-rotate-90" : ""}`}
      fill="none" viewBox="0 0 24 24" stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

export function TestResultBox({ result, passedMsg, failedMsg }: { result: TestResult; passedMsg: string; failedMsg: string }) {
  return (
    <div className={`rounded p-3 text-xs mb-3 ${result.success ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
      <p className={`font-semibold mb-1 ${result.success ? "text-green-800" : "text-red-800"}`}>
        {result.success ? `✓ ${passedMsg}` : `✗ ${failedMsg}`}
      </p>
      {result.steps.map((step, i) => (
        <p key={i} className={step.success ? "text-green-700" : "text-red-700"}>
          {step.success ? "✓" : "✗"} <span className="font-medium">{step.name}:</span> {step.message}
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
    <div className="border rounded overflow-hidden mb-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-gray-500 border-b bg-gray-50/50">
            <th className="text-left px-4 py-2 font-medium w-48">{keyColLabel}</th>
            <th className="text-left px-4 py-2 font-medium">{valueColLabel}</th>
          </tr>
        </thead>
        <tbody>
          {fields.map((field) => {
            const val = fieldValues[field.key] ?? "";
            const isUnchanged = field.sensitive && val === "****";
            return (
              <tr key={field.key} className="border-b last:border-b-0 hover:bg-gray-50/30">
                <td className="px-4 py-2.5 text-gray-700 font-mono text-xs whitespace-nowrap">
                  {field.key}
                  {field.description && <div className="text-gray-400 font-sans">{field.description}</div>}
                </td>
                <td className="px-4 py-2.5">
                  <input
                    type={field.sensitive ? "password" : "text"}
                    className="w-full border rounded px-2 py-1 text-xs font-mono"
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
