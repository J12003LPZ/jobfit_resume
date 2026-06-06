import type { JobAnalysis } from "@/types/job";
import type { CoverLetter } from "@/types/coverLetter";
import { jobKeywordList } from "./jobKeywords";

export type CoverLetterCoverage = {
  covered: string[];
  missing: string[];
  coverageScore: number; // 0–100
};

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Literal, case-insensitive, whole-word presence of each job keyword in the
// letter prose (opening + body + closing). The greeting is excluded — it is a
// fixed salutation, not a place to score keywords against. Responsibilities are
// never part of jobKeywordList, so they cannot affect the result.
export function coverLetterCoverage(
  job: JobAnalysis,
  letter: CoverLetter,
): CoverLetterCoverage {
  const prose = [letter.opening, ...letter.body, letter.closing].join(" ");

  // Dedupe by lowercased form, keep the first original spelling for display.
  const seen = new Set<string>();
  const universe: string[] = [];
  for (const kw of jobKeywordList(job)) {
    const key = kw.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    universe.push(kw.trim());
  }

  const covered: string[] = [];
  const missing: string[] = [];
  for (const kw of universe) {
    const re = new RegExp(`\\b${escapeRegExp(kw)}\\b`, "i");
    (re.test(prose) ? covered : missing).push(kw);
  }

  const coverageScore =
    universe.length === 0
      ? 0
      : Math.round((covered.length / universe.length) * 100);

  return { covered, missing, coverageScore };
}
