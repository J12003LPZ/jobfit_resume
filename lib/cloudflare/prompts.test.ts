import { describe, it, expect } from "vitest";
import { coverLetterUser } from "./prompts";
import { leonardoProfile } from "@/data/leonardo-profile";
import type { JobAnalysis } from "@/types/job";

const job: JobAnalysis = {
  jobTitle: "Full-Stack Engineer",
  technologies: ["React", "react.js", "Node.js"], // react.js dups React after normalize
  hardSkills: ["REST APIs"],
  softSkills: ["communication"],
  responsibilities: ["ship features"],
  preferredQualifications: [],
  atsKeywords: ["Automation"],
};

describe("coverLetterUser", () => {
  it("builds a de-duplicated keywordsToWeave list across all sources", () => {
    const out = JSON.parse(
      coverLetterUser({
        profile: leonardoProfile,
        jobAnalysis: job,
        matchedKeywords: ["TypeScript"],
        acceptedGapKeywords: ["Agile"],
      }),
    );
    const kw: string[] = out.keywordsToWeave;
    expect(kw).toEqual(
      expect.arrayContaining([
        "TypeScript", "Agile", "React", "Node.js",
        "REST APIs", "communication", "Automation",
      ]),
    );
    // "react.js" collapses into "React" — only one react* survives.
    const reactish = kw.filter((k) => k.toLowerCase().startsWith("react"));
    expect(reactish).toHaveLength(1);
    // No retry fields on a first-pass call.
    expect(out.previousDraft).toBeUndefined();
    expect(out.mustCover).toBeUndefined();
  });

  it("includes previousDraft + mustCover with a revision instruction on retry", () => {
    const prior = {
      greeting: "Dear Hiring Manager,",
      opening: "o",
      body: ["b"],
      closing: "c",
    };
    const out = JSON.parse(
      coverLetterUser({
        profile: leonardoProfile,
        jobAnalysis: job,
        matchedKeywords: [],
        acceptedGapKeywords: [],
        priorContent: prior,
        mustCover: ["Automation", "communication"],
      }),
    );
    expect(out.previousDraft).toEqual(prior);
    expect(out.mustCover).toEqual(["Automation", "communication"]);
    expect(out.instruction.toLowerCase()).toContain("revise");
  });
});
