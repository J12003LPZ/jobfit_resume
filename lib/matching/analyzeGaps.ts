import type { JobAnalysis } from "@/types/job";
import type { GapAnalysis } from "@/types/resume";
import { compareKeywords } from "./compareKeywords";
import { calculateMatchScore } from "./calculateMatchScore";
import { jobKeywordList } from "./jobKeywords";

export function analyzeGaps(
  job: JobAnalysis,
  profileKeywords: string[]
): GapAnalysis {
  const { matched, gap } = compareKeywords(jobKeywordList(job), profileKeywords);

  const matchScore = calculateMatchScore(job, profileKeywords);
  // Potential: pretend the profile also has every gap keyword. Because the gaps
  // are exactly the un-matched members of jobKeywordList — the same universe the
  // score is computed over — this resolves to a full 100% match.
  const potentialScore = calculateMatchScore(job, [...profileKeywords, ...gap]);

  return {
    matchedKeywords: matched,
    gapKeywords: gap,
    similarKeywords: [],
    matchScore,
    potentialScore,
  };
}
