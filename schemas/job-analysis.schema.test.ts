import { describe, it, expect } from "vitest";
import { jobAnalysisSchema } from "./job-analysis.schema";

describe("jobAnalysisSchema", () => {
  it("accepts a valid analysis", () => {
    const valid = {
      jobTitle: "Frontend Developer",
      technologies: ["React", "TypeScript"],
      hardSkills: ["debugging"],
      softSkills: ["communication"],
      responsibilities: ["Build UIs"],
      preferredQualifications: [],
      atsKeywords: ["React", "Agile"],
    };
    expect(jobAnalysisSchema.parse(valid).jobTitle).toBe("Frontend Developer");
  });

  it("defaults missing arrays to empty and rejects missing jobTitle", () => {
    const partial = { jobTitle: "Dev" };
    const parsed = jobAnalysisSchema.parse(partial);
    expect(parsed.technologies).toEqual([]);
    expect(() => jobAnalysisSchema.parse({})).toThrow();
  });
});
