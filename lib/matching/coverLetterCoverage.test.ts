import { describe, it, expect } from "vitest";
import { coverLetterCoverage } from "./coverLetterCoverage";
import type { JobAnalysis } from "@/types/job";
import type { CoverLetter } from "@/types/coverLetter";

const job: JobAnalysis = {
  jobTitle: "Frontend Developer",
  technologies: ["React", "TypeScript"],
  hardSkills: ["unit testing"],
  softSkills: ["communication"],
  responsibilities: ["build features"], // sentence — excluded from the universe
  preferredQualifications: [],
  atsKeywords: ["REST APIs"],
};

function letter(overrides: Partial<CoverLetter>): CoverLetter {
  return {
    candidateName: "Leonardo Lopez",
    contact: { email: "a@b.com", location: "NYC" },
    date: "June 5, 2026",
    recipient: "Hiring Team, Acme",
    jobTitle: "Frontend Developer",
    greeting: "Dear Hiring Manager,",
    opening: "",
    body: [],
    closing: "",
    ...overrides,
  };
}

describe("coverLetterCoverage", () => {
  it("reports keywords that literally appear in the prose", () => {
    const l = letter({
      opening: "I build with React and TypeScript.",
      body: ["I practice unit testing and design REST APIs."],
      closing: "Thanks for your communication.",
    });
    const result = coverLetterCoverage(job, l);
    expect(result.covered.sort()).toEqual(
      ["REST APIs", "React", "TypeScript", "communication", "unit testing"].sort(),
    );
    expect(result.missing).toEqual([]);
    expect(result.coverageScore).toBe(100);
  });

  it("lists keywords absent from the prose as missing", () => {
    const l = letter({ opening: "I love React." });
    const result = coverLetterCoverage(job, l);
    expect(result.covered).toEqual(["React"]);
    expect(result.missing.sort()).toEqual(
      ["REST APIs", "TypeScript", "communication", "unit testing"].sort(),
    );
    expect(result.coverageScore).toBe(20); // 1 of 5
  });

  it("matches case-insensitively and only on whole words", () => {
    const l = letter({ opening: "reactivity is not the same as REACT." });
    const result = coverLetterCoverage(job, l);
    expect(result.covered).toContain("React"); // whole word "REACT" matches
  });

  it("ignores the greeting and never reads responsibilities", () => {
    const l = letter({ greeting: "Dear React Team,", opening: "Hello." });
    const result = coverLetterCoverage(job, l);
    expect(result.covered).toEqual([]); // greeting is not scanned
  });

  it("returns 0 when the job has no scannable keywords", () => {
    const empty: JobAnalysis = {
      ...job, technologies: [], hardSkills: [], softSkills: [], atsKeywords: [],
    };
    expect(coverLetterCoverage(empty, letter({ opening: "React" })).coverageScore).toBe(0);
  });
});
