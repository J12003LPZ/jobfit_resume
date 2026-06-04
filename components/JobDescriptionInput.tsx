"use client";
import { Textarea } from "./ui/Textarea";
import { Button } from "./ui/Button";

export function JobDescriptionInput({
  value,
  onChange,
  onAnalyze,
  onClear,
  loading,
}: {
  value: string;
  onChange: (v: string) => void;
  onAnalyze: () => void;
  onClear: () => void;
  loading: boolean;
}) {
  return (
    <div className="space-y-3">
      <Textarea
        rows={14}
        placeholder="Paste the job description here..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <p className="text-xs text-[var(--color-on-surface-variant)]">
        The more complete the description, the better the keyword extraction.
      </p>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClear}>Clear</Button>
        <Button variant="primary" onClick={onAnalyze} disabled={loading || !value.trim()}>
          {loading ? "Analyzing…" : "Analyze Job"}
        </Button>
      </div>
    </div>
  );
}
