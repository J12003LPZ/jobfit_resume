import { describe, it, expect } from "vitest";
import { generatedResumeSchema } from "./resume.schema";

const minimal = {
  name: "Leonardo",
  title: "Software Engineer",
  contact: { email: "a@b.c", location: "NY" },
  summary: "Builds things.",
};

describe("generatedResumeSchema", () => {
  it("defaults a missing projects array to empty", () => {
    const parsed = generatedResumeSchema.parse({ ...minimal, skills: ["React"], experience: [], education: [] });
    expect(parsed.projects).toEqual([]);
  });

  it("defaults every omitted top-level array", () => {
    const parsed = generatedResumeSchema.parse(minimal);
    expect(parsed.skills).toEqual([]);
    expect(parsed.experience).toEqual([]);
    expect(parsed.projects).toEqual([]);
    expect(parsed.education).toEqual([]);
  });

  it("still validates present items strictly", () => {
    expect(() =>
      generatedResumeSchema.parse({ ...minimal, projects: [{ name: "X" }] }),
    ).toThrow();
  });
});
