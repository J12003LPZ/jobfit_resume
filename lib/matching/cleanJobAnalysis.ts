import type { JobAnalysis } from "@/types/job";
import { normalizeKeyword } from "./normalizeKeyword";

const MAX_KEYWORD_WORDS = 4;

function dedupeInto(list: string[], seen: Set<string>): string[] {
  const out: string[] = [];
  for (const kw of list) {
    const trimmed = kw?.trim();
    if (!trimmed) continue;
    const norm = normalizeKeyword(trimmed);
    if (!norm || seen.has(norm)) continue;
    seen.add(norm);
    out.push(trimmed);
  }
  return out;
}

// Deterministic cleanup of the model's extraction: alias-aware dedupe within
// and across the scannable keyword lists (precedence: technologies > hardSkills
// > softSkills > atsKeywords), and drop atsKeywords that are sentence-length —
// the model occasionally pastes a responsibility line in there despite the
// prompt. Responsibilities and preferredQualifications are full sentences by
// design and pass through untouched.
export function cleanJobAnalysis(a: JobAnalysis): JobAnalysis {
  const seen = new Set<string>();
  const technologies = dedupeInto(a.technologies, seen);
  const hardSkills = dedupeInto(a.hardSkills, seen);
  const softSkills = dedupeInto(a.softSkills, seen);
  const atsKeywords = dedupeInto(a.atsKeywords, seen).filter(
    (kw) => kw.split(/\s+/).length <= MAX_KEYWORD_WORDS,
  );
  return { ...a, technologies, hardSkills, softSkills, atsKeywords };
}
