import { describe, it, expect } from "vitest";
import { jobKeywordList } from "./jobKeywords";
import type { JobAnalysis } from "@/types/job";

const job: JobAnalysis = {
  jobTitle: "Dev",
  technologies: ["React"],
  hardSkills: ["debugging"],
  softSkills: ["communication"],
  responsibilities: ["build apis"], // sentence — must be excluded
  preferredQualifications: ["nice to have"], // must be excluded
  atsKeywords: ["Agile"],
};

describe("jobKeywordList", () => {
  it("unions technologies, hardSkills, softSkills, and atsKeywords in order", () => {
    expect(jobKeywordList(job)).toEqual([
      "React",
      "debugging",
      "communication",
      "Agile",
    ]);
  });

  it("excludes responsibilities and preferredQualifications", () => {
    const flat = jobKeywordList(job);
    expect(flat).not.toContain("build apis");
    expect(flat).not.toContain("nice to have");
  });
});
