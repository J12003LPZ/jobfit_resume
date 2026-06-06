import { KeywordSection } from "./KeywordSection";
import type { CoverLetterCoverage } from "@/lib/matching/coverLetterCoverage";

export function CoverLetterCoveragePanel({
  coverage,
}: {
  coverage: CoverLetterCoverage;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold">Keyword coverage</h3>
        <span className="font-display text-lg font-semibold text-[var(--color-primary)]">
          {coverage.coverageScore}%
        </span>
      </div>
      <KeywordSection title="In the letter" keywords={coverage.covered} tone="matched" />
      <KeywordSection title="Not yet mentioned" keywords={coverage.missing} tone="gap" />
    </div>
  );
}
