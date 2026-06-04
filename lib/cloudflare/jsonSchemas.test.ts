import { describe, it, expect } from "vitest";
import { jobAnalysisJsonSchema, generatedResumeJsonSchema } from "./jsonSchemas";

describe("json schemas", () => {
  it("job analysis schema declares the required keys", () => {
    const props = (jobAnalysisJsonSchema as any).properties;
    expect(Object.keys(props)).toEqual(
      expect.arrayContaining([
        "jobTitle", "technologies", "hardSkills", "softSkills",
        "responsibilities", "preferredQualifications", "atsKeywords",
      ])
    );
  });
  it("generated resume schema declares experience and education", () => {
    const props = (generatedResumeJsonSchema as any).properties;
    expect(props.experience).toBeDefined();
    expect(props.education).toBeDefined();
  });
});
