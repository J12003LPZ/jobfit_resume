import { normalizeKeyword } from "./normalizeKeyword";

export type CompareResult = {
  matched: string[];
  gap: string[];
};

export function compareKeywords(
  jobKeywords: string[],
  profileKeywords: string[]
): CompareResult {
  const profileSet = new Set(
    profileKeywords.map(normalizeKeyword).filter(Boolean)
  );
  const matched: string[] = [];
  const gap: string[] = [];
  const seen = new Set<string>();

  for (const kw of jobKeywords) {
    const norm = normalizeKeyword(kw);
    if (!norm || seen.has(norm)) continue;
    seen.add(norm);
    if (profileSet.has(norm)) matched.push(kw.trim());
    else gap.push(kw.trim());
  }
  return { matched, gap };
}
