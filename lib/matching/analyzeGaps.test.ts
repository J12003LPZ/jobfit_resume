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

  it("does not surface responsibility sentences as keyword chips", () => {
    const sentence = "Collaborate with team members to design and implement new features";
    const j: JobAnalysis = { ...job, responsibilities: [sentence], atsKeywords: ["GraphQL"] };
    const result = analyzeGaps(j, []);
    const chips = [...result.matchedKeywords, ...result.gapKeywords];
    expect(chips).not.toContain(sentence);
    expect(result.gapKeywords).toContain("GraphQL");
  });

  it("reaches 100% potential for a keyword-light job with responsibilities (regression)", () => {
    // Mirrors the "Data Entry Associate" screenshot: no technologies, several
    // soft/ats gaps, and responsibility sentences. The old weighted model capped
    // this at 67% because responsibilities (20% weight) were uncoverable.
    const dataEntry: JobAnalysis = {
      jobTitle: "Data Entry Associate",
      technologies: [],
      hardSkills: ["data entry", "database management"],
      softSkills: ["communication skills", "professional demeanor"],
      responsibilities: ["Enter records into the system accurately and on time"],
      preferredQualifications: [],
      atsKeywords: ["computer skills", "email", "customer service"],
    };
    const profile = ["database management"]; // exactly one real match

    const result = analyzeGaps(dataEntry, profile);

    expect(result.matchScore).toBeLessThan(100);
    expect(result.potentialScore).toBe(100); // accepting every gap == full coverage
  });
});
