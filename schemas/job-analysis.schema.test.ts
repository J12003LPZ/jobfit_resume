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

  it("defaults missing arrays to empty", () => {
    const partial = { jobTitle: "Dev" };
    const parsed = jobAnalysisSchema.parse(partial);
    expect(parsed.technologies).toEqual([]);
  });

  it("coerces empty, whitespace, or missing jobTitle to a fallback", () => {
    expect(jobAnalysisSchema.parse({ jobTitle: "" }).jobTitle).toBe("Untitled Role");
    expect(jobAnalysisSchema.parse({ jobTitle: "   " }).jobTitle).toBe("Untitled Role");
    expect(jobAnalysisSchema.parse({}).jobTitle).toBe("Untitled Role");
  });

  it("trims a valid jobTitle", () => {
    expect(jobAnalysisSchema.parse({ jobTitle: "  Dev  " }).jobTitle).toBe("Dev");
  });
});
