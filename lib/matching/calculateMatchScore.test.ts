import { describe, it, expect } from "vitest";
import { calculateMatchScore } from "./calculateMatchScore";
import type { JobAnalysis } from "@/types/job";

const job: JobAnalysis = {
  jobTitle: "Dev",
  technologies: ["React", "TypeScript"], // 40% weight
  hardSkills: ["debugging", "testing"],  // 30%
  softSkills: ["communication"],         // 10%
  responsibilities: ["build apis"],      // 20%
  preferredQualifications: [],
  atsKeywords: [],
};

describe("calculateMatchScore", () => {
  it("returns 100 when profile covers everything", () => {
    const profile = ["react", "typescript", "debugging", "testing", "communication", "build apis"];
    expect(calculateMatchScore(job, profile)).toBe(100);
  });

  it("returns 0 when nothing matches", () => {
    expect(calculateMatchScore(job, ["python"])).toBe(0);
  });

  it("weights categories: tech-only match (2/2) = 40", () => {
    expect(calculateMatchScore(job, ["react", "typescript"])).toBe(40);
  });

  it("ignores empty categories without dividing by zero", () => {
    const techOnly: JobAnalysis = { ...job, hardSkills: [], softSkills: [], responsibilities: [] };
    expect(calculateMatchScore(techOnly, ["react", "typescript"])).toBe(100);
  });
});
