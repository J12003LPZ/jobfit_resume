import { describe, it, expect } from "vitest";
import { resumeToPlainText } from "./toPlainText";
import { leonardoProfile } from "@/data/leonardo-profile";

describe("resumeToPlainText", () => {
  it("includes name, headings, and skills", () => {
    const text = resumeToPlainText(leonardoProfile);
    expect(text).toContain("LEONARDO LOPEZ");
    expect(text).toContain("PROFESSIONAL SUMMARY");
    expect(text).toContain("TECHNICAL SKILLS");
    expect(text).toContain("Python");
  });
});
