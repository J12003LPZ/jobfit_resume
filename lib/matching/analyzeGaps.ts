import type { JobAnalysis } from "@/types/job";
import type { GapAnalysis } from "@/types/resume";
import { compareKeywords } from "./compareKeywords";
import { calculateMatchScore } from "./calculateMatchScore";

// Flatten job keywords for the matched/gap chip lists. Responsibilities are
// full-sentence duties, not scannable keywords, so they're excluded here — the
// granular terms a recruiter/ATS scans for live in atsKeywords.
function allJobKeywords(job: JobAnalysis): string[] {
  return [
    ...job.technologies,
    ...job.hardSkills,
    ...job.softSkills,
    ...job.atsKeywords,
  ];
}

export function analyzeGaps(
  job: JobAnalysis,
  profileKeywords: string[]
): GapAnalysis {
  const { matched, gap } = compareKeywords(allJobKeywords(job), profileKeywords);

  const matchScore = calculateMatchScore(job, profileKeywords);
  // Potential: pretend the profile also has every gap keyword.
  const potentialScore = calculateMatchScore(job, [...profileKeywords, ...gap]);

  return {
    matchedKeywords: matched,
    gapKeywords: gap,
    similarKeywords: [],
    matchScore,
    potentialScore,
  };
}
