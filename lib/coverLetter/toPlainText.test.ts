import { describe, it, expect } from "vitest";
import { coverLetterToPlainText } from "./toPlainText";
import type { CoverLetter } from "@/types/coverLetter";

const letter: CoverLetter = {
  candidateName: "Leonardo Lopez",
  contact: { email: "leo@example.com", location: "New York, NY", phone: "(347) 000-0000" },
  date: "June 5, 2026",
  recipient: "Hiring Team, Acme Corp",
  jobTitle: "Frontend Developer",
  greeting: "Dear Hiring Manager,",
  opening: "I am excited to apply for the Frontend Developer role.",
  body: ["Paragraph one.", "Paragraph two."],
  closing: "Thank you for your time.",
};

describe("coverLetterToPlainText", () => {
  it("includes header, date, recipient, greeting, all paragraphs, and a signature", () => {
    const text = coverLetterToPlainText(letter);
    expect(text).toContain("Leonardo Lopez");
    expect(text).toContain("leo@example.com");
    expect(text).toContain("June 5, 2026");
    expect(text).toContain("Hiring Team, Acme Corp");
    expect(text).toContain("Dear Hiring Manager,");
    expect(text).toContain("I am excited to apply");
    expect(text).toContain("Paragraph one.");
    expect(text).toContain("Paragraph two.");
    expect(text).toContain("Thank you for your time.");
    expect(text).toContain("Sincerely,");
    // The candidate's name appears at least twice (header + signature).
    expect(text.match(/Leonardo Lopez/g)?.length).toBeGreaterThanOrEqual(2);
  });
});
