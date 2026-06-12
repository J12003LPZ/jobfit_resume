import { describe, expect, it } from "vitest";
import { cleanJobAnalysis } from "./cleanJobAnalysis";
import type { JobAnalysis } from "@/types/job";

function base(overrides: Partial<JobAnalysis> = {}): JobAnalysis {
  return {
    jobTitle: "Software Engineer",
    companyName: "Acme",
    technologies: [],
    hardSkills: [],
    softSkills: [],
    responsibilities: [],
    preferredQualifications: [],
    atsKeywords: [],
    ...overrides,
  };
}

describe("cleanJobAnalysis", () => {
  it("removes cross-list duplicates with technologies taking precedence", () => {
    const out = cleanJobAnalysis(
      base({
        technologies: ["React", "TypeScript"],
        hardSkills: ["ReactJS", "SQL"],
        atsKeywords: ["react", "typescript", "SQL", "Agile"],
      }),
    );
    expect(out.technologies).toEqual(["React", "TypeScript"]);
    expect(out.hardSkills).toEqual(["SQL"]);
    expect(out.atsKeywords).toEqual(["Agile"]);
  });

  it("removes duplicates within a single list", () => {
    const out = cleanJobAnalysis(base({ technologies: ["React", "react.js"] }));
    expect(out.technologies).toEqual(["React"]);
  });

  it("drops sentence-length atsKeywords (more than 4 words)", () => {
    const out = cleanJobAnalysis(
      base({
        atsKeywords: [
          "REST APIs",
          "Collaborate with team members to design and ship features",
        ],
      }),
    );
    expect(out.atsKeywords).toEqual(["REST APIs"]);
  });

  it("leaves responsibilities and preferredQualifications untouched", () => {
    const resp = ["Build and maintain web applications end to end"];
    const out = cleanJobAnalysis(base({ responsibilities: resp }));
    expect(out.responsibilities).toEqual(resp);
  });
});
