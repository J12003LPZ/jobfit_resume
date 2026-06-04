import { describe, it, expect } from "vitest";
import { leonardoProfile } from "./leonardo-profile";
import { profileSchema } from "@/schemas/profile.schema";

describe("leonardoProfile", () => {
  it("conforms to the profile schema", () => {
    expect(() => profileSchema.parse(leonardoProfile)).not.toThrow();
  });
  it("has the expected identity and one experience entry", () => {
    expect(leonardoProfile.name).toBe("Leonardo Lopez");
    expect(leonardoProfile.experience).toHaveLength(1);
    expect(leonardoProfile.experience[0].company).toContain("Records");
    expect(leonardoProfile.education.length).toBeGreaterThanOrEqual(2);
  });
});
