import type { JobAnalysis } from "@/types/job";
import { normalizeKeyword } from "./normalizeKeyword";

const WEIGHTS = {
  technologies: 40,
  hardSkills: 30,
  responsibilities: 20,
  softSkills: 10,
} as const;

function categoryRatio(items: string[], profileSet: Set<string>): number | null {
  const normed = items.map(normalizeKeyword).filter(Boolean);
  if (normed.length === 0) return null; // empty category contributes nothing
  const matched = normed.filter((k) => profileSet.has(k)).length;
  return matched / normed.length;
}

export function calculateMatchScore(
  job: JobAnalysis,
  profileKeywords: string[]
): number {
  const profileSet = new Set(profileKeywords.map(normalizeKeyword).filter(Boolean));

  let weightedSum = 0;
  let totalWeight = 0;
  for (const [cat, weight] of Object.entries(WEIGHTS) as [keyof typeof WEIGHTS, number][]) {
    const ratio = categoryRatio(job[cat], profileSet);
    if (ratio === null) continue;
    weightedSum += ratio * weight;
    totalWeight += weight;
  }
  if (totalWeight === 0) return 0;
  // Re-base to 0-100 across only the present categories.
  return Math.round((weightedSum / totalWeight) * 100);
}
