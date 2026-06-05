import type { JobAnalysis } from "@/types/job";

// The single keyword universe used for BOTH the match score and the gap chips.
// Keeping them in sync here is what guarantees that accepting every gap keyword
// yields a 100% match. Responsibilities are full-sentence duties (not scannable
// keywords) and preferredQualifications are nice-to-haves; their scannable terms
// already live in atsKeywords, so both are intentionally excluded.
export function jobKeywordList(job: JobAnalysis): string[] {
  return [
    ...job.technologies,
    ...job.hardSkills,
    ...job.softSkills,
    ...job.atsKeywords,
  ];
}
