import { normalizeKeyword } from "@/lib/matching/normalizeKeyword";

export function removeDuplicates(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const norm = normalizeKeyword(item);
    if (!norm) continue;
    if (seen.has(norm)) continue;
    seen.add(norm);
    out.push(item.trim());
  }
  return out;
}
