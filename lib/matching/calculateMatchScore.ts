import type { JobAnalysis } from "@/types/job";
import { normalizeKeyword } from "./normalizeKeyword";
import { jobKeywordList } from "./jobKeywords";

// Equal-weight keyword coverage: the fraction of the job's unique scannable
// keywords that appear in the candidate's keyword set. Scored over the SAME
// universe the gap chips are drawn from (jobKeywordList), so accepting every
// surfaced gap keyword always yields a full 100% match.
export function calculateMatchScore(
  job: JobAnalysis,
  profileKeywords: string[]
): number {
  const universe = Array.from(
    new Set(jobKeywordList(job).map(normalizeKeyword).filter(Boolean))
  );
  if (universe.length === 0) return 0;

  const profileSet = new Set(
    profileKeywords.map(normalizeKeyword).filter(Boolean)
  );
  const matched = universe.filter((k) => profileSet.has(k)).length;
  return Math.round((matched / universe.length) * 100);
}
