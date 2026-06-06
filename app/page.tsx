"use client";

import { useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { Card, CardTitle } from "@/components/ui/Card";
import { JobDescriptionInput, type JobInputMode } from "@/components/JobDescriptionInput";
import { JobAnalysisPanel } from "@/components/JobAnalysisPanel";
import { ResumePreview } from "@/components/ResumePreview";
import { ResumeChecks } from "@/components/ResumeChecks";
import { ExportButtons } from "@/components/ExportButtons";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/Button";
import { normalizeKeyword } from "@/lib/matching/normalizeKeyword";
import { calculateMatchScore } from "@/lib/matching/calculateMatchScore";
import { profileKeywords } from "@/data/leonardo-profile";
import type { JobAnalysis } from "@/types/job";
import type { GapAnalysis, GapMode } from "@/types/resume";
import type { Profile } from "@/types/profile";
import type { ValidationResult } from "@/lib/resume/validateResume";
import { CoverLetterPreview } from "@/components/CoverLetterPreview";
import { CoverLetterExportButtons } from "@/components/CoverLetterExportButtons";
import { CoverLetterCoveragePanel } from "@/components/CoverLetterCoveragePanel";
import type { CoverLetter } from "@/types/coverLetter";
import type { CoverLetterCoverage } from "@/lib/matching/coverLetterCoverage";

export default function Page() {
  const [jd, setJd] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [inputMode, setInputMode] = useState<JobInputMode>("text");
  const [analyzing, setAnalyzing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [analysis, setAnalysis] = useState<JobAnalysis | null>(null);
  const [gap, setGap] = useState<GapAnalysis | null>(null);
  const [gapMode, setGapMode] = useState<GapMode>("verified_only");
  const [accepted, setAccepted] = useState<string[]>([]);

  const [resume, setResume] = useState<Profile | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [coverLetter, setCoverLetter] = useState<CoverLetter | null>(null);
  const [coverage, setCoverage] = useState<CoverLetterCoverage | null>(null);
  const [generatingCover, setGeneratingCover] = useState(false);

  const liveScore = useMemo(() => {
    if (!analysis) return 0;
    return calculateMatchScore(analysis, [...profileKeywords(), ...accepted]);
  }, [analysis, accepted]);

  async function analyze() {
    setAnalyzing(true);
    setError(null);
    setResume(null);
    setCoverLetter(null);
    setCoverage(null);
    try {
      const res = await fetch("/api/analyze-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          inputMode === "url" ? { jobUrl } : { jobDescription: jd },
        ),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Analysis failed");
      setAnalysis(json.analysis);
      setGap(json.gap);
      setGapMode("verified_only");
      setAccepted([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }

  function acceptAll() {
    if (!gap) return;
    setGapMode("accept_all");
    setAccepted([...gap.gapKeywords]);
  }
  function verifiedOnly() {
    setGapMode("verified_only");
    setAccepted([]);
  }
  function customize() {
    setGapMode("custom");
  }
  function toggleKeyword(kw: string) {
    const n = normalizeKeyword(kw);
    setAccepted((prev) =>
      prev.some((k) => normalizeKeyword(k) === n)
        ? prev.filter((k) => normalizeKeyword(k) !== n)
        : [...prev, kw]
    );
  }

  async function generate() {
    if (!analysis || !gap) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobAnalysis: analysis,
          matchedKeywords: gap.matchedKeywords,
          acceptedGapKeywords: accepted,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Generation failed");
      setResume(json.resume);
      setValidation(json.validation);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function generateCoverLetter() {
    if (!analysis || !gap) return;
    setGeneratingCover(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobAnalysis: analysis,
          matchedKeywords: gap.matchedKeywords,
          acceptedGapKeywords: accepted,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Cover letter generation failed");
      setCoverLetter(json.coverLetter);
      setCoverage(json.coverage);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cover letter generation failed");
    } finally {
      setGeneratingCover(false);
    }
  }

  function clearAll() {
    setJd("");
    setJobUrl("");
    setAnalysis(null);
    setGap(null);
    setResume(null);
    setValidation(null);
    setCoverLetter(null);
    setCoverage(null);
    setError(null);
  }

  return (
    <main className="min-h-full">
      <Header />
      <div className="mx-auto max-w-[1440px] space-y-8 px-6 py-10">
        <section className="animate-rise max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-primary)]">
            Beat the keyword filter
          </p>
          <h2 className="mt-3 font-display text-4xl font-semibold leading-[1.08] tracking-[-0.02em] text-[var(--color-on-surface)] sm:text-5xl">
            Tailor your résumé to the{" "}
            <span className="italic text-[var(--color-primary)]">job</span>, not
            the other way around.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[var(--color-on-surface-variant)]">
            Paste a posting, accept the keywords you genuinely match, and
            generate an ATS-friendly, single-page résumé in seconds.
          </p>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card className="animate-rise space-y-5">
            <div className="flex items-baseline gap-3">
              <span className="font-display text-sm font-semibold text-[var(--color-primary)]">
                01
              </span>
              <CardTitle>Add the job posting</CardTitle>
            </div>
            <JobDescriptionInput
              mode={inputMode}
              value={jd}
              url={jobUrl}
              onChange={setJd}
              onUrlChange={setJobUrl}
              onModeChange={setInputMode}
              onAnalyze={analyze}
              onClear={clearAll}
              loading={analyzing}
            />
          </Card>

          <div className="space-y-4">
            {!analyzing && !error && !analysis && <EmptyState />}
            {analyzing && (
              <Card><LoadingState label="Analyzing job description…" /></Card>
            )}
            {error && !analyzing && <ErrorState message={error} onRetry={analyze} />}
            {analysis && gap && !analyzing && (
              <JobAnalysisPanel
                analysis={analysis}
                gap={gap}
                liveScore={liveScore}
                gapMode={gapMode}
                acceptedKeywords={accepted}
                onAcceptAll={acceptAll}
                onVerifiedOnly={verifiedOnly}
                onCustomize={customize}
                onToggleKeyword={toggleKeyword}
              />
            )}
            {analysis && gap && !analyzing && (
              <div className="flex flex-wrap gap-2">
                <Button variant="primary" onClick={generate} disabled={generating}>
                  {generating ? "Generating…" : "Generate Resume"}
                </Button>
                <Button variant="secondary" onClick={generateCoverLetter} disabled={generatingCover}>
                  {generatingCover ? "Generating…" : "Generate Cover Letter"}
                </Button>
              </div>
            )}
          </div>
        </section>

        {generating && <Card><LoadingState label="Generating tailored resume…" /></Card>}

        {resume && validation && (
          <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <Card className="space-y-4">
              <div className="flex items-center justify-between">
                <CardTitle>Generated Resume</CardTitle>
                <ExportButtons resume={resume} onRegenerate={generate} />
              </div>
              <ResumePreview resume={resume} />
            </Card>
            <ResumeChecks validation={validation} />
          </section>
        )}

        {generatingCover && <Card><LoadingState label="Generating cover letter…" /></Card>}

        {coverLetter && coverage && (
          <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <Card className="space-y-4">
              <div className="flex items-center justify-between">
                <CardTitle>Cover Letter</CardTitle>
                <CoverLetterExportButtons letter={coverLetter} onRegenerate={generateCoverLetter} />
              </div>
              <CoverLetterPreview letter={coverLetter} />
            </Card>
            <Card className="space-y-4">
              <CardTitle>Keyword Match</CardTitle>
              <CoverLetterCoveragePanel coverage={coverage} />
            </Card>
          </section>
        )}
      </div>
    </main>
  );
}
