import { describe, it, expect } from "vitest";
import { coverLetterContentSchema } from "./cover-letter.schema";

describe("coverLetterContentSchema", () => {
  it("parses a complete prose object", () => {
    const parsed = coverLetterContentSchema.parse({
      greeting: "Dear Hiring Manager,",
      opening: "I am excited to apply.",
      body: ["Para one.", "Para two."],
      closing: "Thank you.",
    });
    expect(parsed.body).toHaveLength(2);
  });

  it("defaults greeting and body when the model omits them", () => {
    const parsed = coverLetterContentSchema.parse({
      opening: "Hello.",
      closing: "Bye.",
    });
    expect(parsed.greeting).toBe("Dear Hiring Manager,");
    expect(parsed.body).toEqual([]);
  });
});
