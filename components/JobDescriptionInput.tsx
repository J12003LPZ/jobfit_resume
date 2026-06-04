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
      className={
        "rounded-md px-3 py-1.5 text-sm font-medium transition " +
        (mode === m
          ? "bg-[var(--color-primary)] text-white"
          : "text-[var(--color-on-surface-variant)] hover:bg-black/5")
      }
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-3">
      <div className="flex gap-1">
        {tab("text", "Paste Description")}
        {tab("url", "Paste URL")}
      </div>

      {mode === "text" ? (
        <>
          <Textarea
            rows={14}
            placeholder="Paste the job description here..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
          <p className="text-xs text-[var(--color-on-surface-variant)]">
            The more complete the description, the better the keyword extraction.
          </p>
        </>
      ) : (
        <>
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
        </>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClear}>Clear</Button>
        <Button
          variant="primary"
          onClick={onAnalyze}
          disabled={loading || activeEmpty}
        >
          {loading ? "Analyzing…" : "Analyze Job"}
        </Button>
      </div>
    </div>
  );
}
