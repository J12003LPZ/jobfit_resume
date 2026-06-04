"use client";
import { Textarea } from "./ui/Textarea";
import { Input } from "./ui/Input";
import { Button } from "./ui/Button";

export type JobInputMode = "text" | "url";

export function JobDescriptionInput({
  mode,
  value,
  url,
  onChange,
  onUrlChange,
  onModeChange,
  onAnalyze,
  onClear,
  loading,
}: {
  mode: JobInputMode;
  value: string;
  url: string;
  onChange: (v: string) => void;
  onUrlChange: (v: string) => void;
  onModeChange: (m: JobInputMode) => void;
  onAnalyze: () => void;
  onClear: () => void;
  loading: boolean;
}) {
  const activeEmpty = mode === "text" ? !value.trim() : !url.trim();

  const tab = (m: JobInputMode, label: string) => (
    <button
      type="button"
      onClick={() => onModeChange(m)}
      aria-pressed={mode === m}
      className={
        "relative flex-1 rounded-[0.5rem] px-3 py-2 text-sm font-medium transition-all duration-200 " +
        (mode === m
          ? "bg-[var(--color-card)] text-[var(--color-on-surface)] shadow-[0_1px_2px_rgba(33,29,23,0.06),0_4px_12px_-8px_rgba(33,29,23,0.3)]"
          : "text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]")
      }
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-[0.65rem] border border-[var(--color-outline)] bg-[var(--color-surface)] p-1">
        {tab("text", "Paste description")}
        {tab("url", "Paste a URL")}
      </div>

      {mode === "text" ? (
        <div className="space-y-2">
          <Textarea
            rows={14}
            placeholder="Paste the full job description here — responsibilities, requirements, tech stack…"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
          <div className="flex items-center justify-between text-xs text-[var(--color-on-surface-variant)]">
            <span>The more complete the description, the better the keyword extraction.</span>
            {value.trim() && (
              <span className="tabular-nums text-[var(--color-on-surface-variant)]/70">
                {value.trim().length.toLocaleString()} chars
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <Input
            type="url"
            placeholder="https://company.com/jobs/123"
            value={url}
            onChange={(e) => onUrlChange(e.target.value)}
          />
          <p className="text-xs text-[var(--color-on-surface-variant)]">
            We&apos;ll fetch the posting and pull out the text. Some sites block
            automated access — paste the description if it fails.
          </p>
        </div>
      )}

      <div className="flex items-center justify-end gap-2 border-t border-[var(--color-outline)] pt-4">
        <Button variant="ghost" onClick={onClear}>
          Clear
        </Button>
        <Button
          variant="primary"
          onClick={onAnalyze}
          disabled={loading || activeEmpty}
        >
          {loading ? "Analyzing…" : "Analyze job →"}
        </Button>
      </div>
    </div>
  );
}
