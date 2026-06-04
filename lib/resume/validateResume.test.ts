import { describe, it, expect } from "vitest";
import { validateResume } from "./validateResume";
import { leonardoProfile } from "@/data/leonardo-profile";

describe("validateResume", () => {
  it("passes for the clean master profile", () => {
    const result = validateResume(leonardoProfile, leonardoProfile);
    expect(result.checks.find((c) => c.id === "sections")?.passed).toBe(true);
    expect(result.checks.find((c) => c.id === "no-fabrication")?.passed).toBe(true);
    expect(result.passedCount).toBeGreaterThanOrEqual(5);
  });

  it("flags a banned phrase in the summary", () => {
    const bad = { ...leonardoProfile, summary: "I am a results-driven team player." };
    const result = validateResume(bad, leonardoProfile);
    expect(result.checks.find((c) => c.id === "no-banned-phrases")?.passed).toBe(false);
  });

  it("flags a fabricated company not in the master profile", () => {
    const bad = {
      ...leonardoProfile,
      experience: [{ ...leonardoProfile.experience[0], company: "Google" }],
    };
    const result = validateResume(bad, leonardoProfile);
    expect(result.checks.find((c) => c.id === "no-fabrication")?.passed).toBe(false);
  });

  it("flags duplicate skills", () => {
    const bad = { ...leonardoProfile, skills: ["React", "react", "SQL"] };
    const result = validateResume(bad, leonardoProfile);
    expect(result.checks.find((c) => c.id === "no-duplicate-skills")?.passed).toBe(false);
  });
});
