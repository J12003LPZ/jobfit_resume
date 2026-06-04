import { describe, it, expect } from "vitest";
import { analyzeGaps } from "./analyzeGaps";
import type { JobAnalysis } from "@/types/job";

const job: JobAnalysis = {
  jobTitle: "Frontend Developer",
  technologies: ["React", "TypeScript", "AWS", "Docker"],
  hardSkills: ["debugging"],
  softSkills: ["communication"],
  responsibilities: ["build interfaces"],
  preferredQualifications: [],
  atsKeywords: [],
};

describe("analyzeGaps", () => {
  it("computes matched, gap, and both scores", () => {
    const profileKeywords = ["typescript", "debugging", "communication", "build interfaces"];
    const result = analyzeGaps(job, profileKeywords);
    expect(result.matchedKeywords).toContain("TypeScript");
    expect(result.gapKeywords).toEqual(expect.arrayContaining(["React", "AWS", "Docker"]));
    expect(result.potentialScore).toBe(100);
    expect(result.matchScore).toBeLessThan(result.potentialScore);
  });
});
