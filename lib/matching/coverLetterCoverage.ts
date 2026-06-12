import type { JobAnalysis } from "@/types/job";
import type { CoverLetter } from "@/types/coverLetter";
import { jobKeywordList } from "./jobKeywords";
import { normalizeKeyword } from "./normalizeKeyword";

export type CoverLetterCoverage = {
  covered: string[];
  missing: string[];
  coverageScore: number; // 0–100
};

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Connector words that need not be present for a multi-word keyword to count.
const STOPWORDS = new Set([
  "and", "or", "of", "the", "a", "an", "to", "with", "for", "in", "on",
]);

// Regex fragment for one token, tolerant of simple plural/singular:
// a trailing "s" on the keyword token is optional, and the prose may add one
// ("platform" <-> "platforms", "api" <-> "apis"). Only stem words longer than
// 3 chars so short tokens like "css"/"AI" are left intact.
function tokenPattern(token: string): string {
  const stem =
    token.length > 3 && token.toLowerCase().endsWith("s")
      ? token.slice(0, -1)
      : token;
  return `${escapeRegExp(stem)}s?`;
}

function splitTokens(form: string): string[] {
  return form.split(/[\s\-/]+/).filter(Boolean);
}

// Candidate spellings for a keyword: the raw form plus the alias-normalized form
// (so "REST"/"RESTful" both reach "rest apis" and either spelling in the letter
// counts). Matching is case-insensitive, so casing of these forms is irrelevant.
function surfaceForms(keyword: string): string[] {
  const forms = new Set<string>();
  const raw = keyword.trim();
  if (raw) forms.add(raw);
  const norm = normalizeKeyword(keyword);
  if (norm) forms.add(norm);
  return [...forms];
}

// A surface form is present when its words appear contiguously (separators
// flexible: space / hyphen / slash) OR — for multi-word forms — when all of its
// significant words appear anywhere in the prose, in any order. Whole-word
// boundaries are always required, so "AI" never matches inside "training".
function formPresent(form: string, prose: string): boolean {
  const tokens = splitTokens(form);
  if (tokens.length === 0) return false;

  const phrase = new RegExp(
    `\\b${tokens.map(tokenPattern).join("[\\s\\-/]+")}\\b`,
    "i",
  );
  if (phrase.test(prose)) return true;

  const significant = tokens.filter((t) => !STOPWORDS.has(t.toLowerCase()));
  if (significant.length >= 2) {
    return significant.every((t) =>
      new RegExp(`\\b${tokenPattern(t)}\\b`, "i").test(prose),
    );
  }
  return false;
}

function isCovered(keyword: string, prose: string): boolean {
  return surfaceForms(keyword).some((f) => formPresent(f, prose));
}

// Generous, case-insensitive presence of each job keyword in the letter prose
// (opening + body + closing). Tolerates hyphen/space, plural/singular, aliases,
// and word order so a genuinely-present concept is not scored as missing. The
// greeting is excluded (fixed salutation); responsibilities are never in
// jobKeywordList, so they cannot affect the result.
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
    (isCovered(kw, prose) ? covered : missing).push(kw);
  }

  const coverageScore =
    universe.length === 0
      ? 0
      : Math.round((covered.length / universe.length) * 100);

  return { covered, missing, coverageScore };
}
