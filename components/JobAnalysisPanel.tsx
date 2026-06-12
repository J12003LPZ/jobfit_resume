import { Card, CardTitle } from "./ui/Card";
import { MatchScoreCard } from "./MatchScoreCard";
import { KeywordSection } from "./KeywordSection";
import { GapReviewPanel } from "./GapReviewPanel";
import type { JobAnalysis } from "@/types/job";
import type { GapAnalysis, GapMode } from "@/types/resume";

export function JobAnalysisPanel({
  analysis,
  gap,
  liveScore,
  gapMode,
  acceptedKeywords,
  onAcceptAll,
  onVerifiedOnly,
  onCustomize,
  onToggleKeyword,
}: {
  analysis: JobAnalysis;
  gap: GapAnalysis;
  liveScore: number;
  gapMode: GapMode;
  acceptedKeywords: string[];
  onAcceptAll: () => void;
  onVerifiedOnly: () => void;
  onCustomize: () => void;
  onToggleKeyword: (kw: string) => void;
}) {
  return (
    <Card className="space-y-5">
      <CardTitle>Job Analysis</CardTitle>
      <p className="text-sm font-medium">
        {analysis.jobTitle}
        {analysis.companyName ? ` · ${analysis.companyName}` : ""}
      </p>
      <MatchScoreCard current={liveScore} potential={gap.potentialScore} />
      <KeywordSection title="Matched Keywords" keywords={gap.matchedKeywords} tone="matched" />
      <KeywordSection title="Missing Keywords (Gaps)" keywords={gap.gapKeywords} tone="gap" />
      {analysis.responsibilities.length > 0 && (
        <details className="rounded-[var(--radius-md)] border border-[var(--color-outline)] p-3">
          <summary className="cursor-pointer text-sm font-semibold">
            Responsibilities ({analysis.responsibilities.length})
          </summary>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--color-on-surface-variant)]">
            {analysis.responsibilities.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </details>
      )}
      {analysis.preferredQualifications.length > 0 && (
        <details className="rounded-[var(--radius-md)] border border-[var(--color-outline)] p-3">
          <summary className="cursor-pointer text-sm font-semibold">
            Preferred Qualifications ({analysis.preferredQualifications.length})
          </summary>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--color-on-surface-variant)]">
            {analysis.preferredQualifications.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </details>
      )}
      <GapReviewPanel
        gapKeywords={gap.gapKeywords}
        gapMode={gapMode}
        acceptedKeywords={acceptedKeywords}
        onAcceptAll={onAcceptAll}
        onVerifiedOnly={onVerifiedOnly}
        onCustomize={onCustomize}
        onToggleKeyword={onToggleKeyword}
      />
    </Card>
  );
}
