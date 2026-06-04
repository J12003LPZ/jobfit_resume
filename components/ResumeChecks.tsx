import { Card, CardTitle } from "./ui/Card";
import type { ValidationResult } from "@/lib/resume/validateResume";

export function ResumeChecks({ validation }: { validation: ValidationResult }) {
  return (
    <Card className="space-y-3">
      <CardTitle>Resume Checks</CardTitle>
      <ul className="space-y-2 text-sm">
        {validation.checks.map((c) => (
          <li key={c.id} className="flex items-center gap-2">
            <span className={c.passed ? "text-[var(--color-emerald)]" : "text-[var(--color-rose)]"}>
              {c.passed ? "✓" : "✕"}
            </span>
            <span>{c.label}</span>
            {c.detail && <span className="text-[var(--color-rose)]">— {c.detail}</span>}
          </li>
        ))}
      </ul>
    </Card>
  );
}
