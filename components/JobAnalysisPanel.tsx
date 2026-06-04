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
