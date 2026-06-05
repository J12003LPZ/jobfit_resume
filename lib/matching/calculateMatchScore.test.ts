import { describe, it, expect } from "vitest";
import { calculateMatchScore } from "./calculateMatchScore";
import type { JobAnalysis } from "@/types/job";

// Scored universe = technologies ∪ hardSkills ∪ softSkills ∪ atsKeywords,
// deduped by normalized form. Here: react, typescript, debugging, testing,
// communication, data entry = 6 unique keywords.
const job: JobAnalysis = {
  jobTitle: "Dev",
  technologies: ["React", "TypeScript"],
  hardSkills: ["debugging", "testing"],
  softSkills: ["communication"],
  responsibilities: ["build apis"], // a sentence — must never affect the score
  preferredQualifications: [],
  atsKeywords: ["data entry"],
};

describe("calculateMatchScore", () => {
  it("returns 100 when the profile covers every scored keyword", () => {
    const profile = [
      "react",
      "typescript",
      "debugging",
      "testing",
      "communication",
      "data entry",
    ];
    expect(calculateMatchScore(job, profile)).toBe(100);
  });

  it("returns 0 when nothing matches", () => {
    expect(calculateMatchScore(job, ["python"])).toBe(0);
  });

  it("weights every unique keyword equally (3 of 6 = 50)", () => {
    expect(calculateMatchScore(job, ["react", "typescript", "debugging"])).toBe(50);
  });

  it("counts atsKeywords toward the score (1 of 6 = 17)", () => {
    expect(calculateMatchScore(job, ["data entry"])).toBe(17);
  });

  it("ignores responsibilities entirely", () => {
    const full = [
      "react",
      "typescript",
      "debugging",
      "testing",
      "communication",
      "data entry",
    ];
    // 'build apis' is a responsibility sentence; adding it must not change 100.
    expect(calculateMatchScore(job, [...full, "build apis"])).toBe(100);
  });

  it("dedupes keywords shared across categories (counts once)", () => {
    const dup: JobAnalysis = {
      ...job,
      technologies: ["React"],
      hardSkills: [],
      softSkills: [],
      atsKeywords: ["React"], // same keyword in two categories
    };
    expect(calculateMatchScore(dup, ["react"])).toBe(100); // 1 of 1, not 1 of 2
  });

  it("returns 0 when the job has no scannable keywords", () => {
    const empty: JobAnalysis = {
      ...job,
      technologies: [],
      hardSkills: [],
      softSkills: [],
      atsKeywords: [],
    };
    expect(calculateMatchScore(empty, ["react"])).toBe(0);
  });
});
