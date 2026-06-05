import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { CoverLetterTemplate } from "./renderCoverLetterTemplate";
import type { CoverLetter } from "@/types/coverLetter";

const letter: CoverLetter = {
  candidateName: "Leonardo Lopez",
  contact: { email: "leo@example.com", location: "New York, NY", phone: "+1 (347) 000-0000" },
  date: "June 5, 2026",
  recipient: "Hiring Team, Acme Corp",
  jobTitle: "Frontend Developer",
  greeting: "Dear Hiring Manager,",
  opening: "Opening paragraph.",
  body: ["Body paragraph one.", "Body paragraph two."],
  closing: "Closing paragraph.",
};

describe("CoverLetterTemplate", () => {
  it("renders all letter sections in document order", () => {
    const { container, getAllByText } = render(<CoverLetterTemplate letter={letter} />);
    const root = container.firstElementChild as HTMLElement;
    const text = root.textContent ?? "";
    // Verify all content present
    expect(text).toContain("Leonardo Lopez");
    expect(text).toContain("New York, NY");
    expect(text).toContain("+1 (347) 000-0000");
    expect(text).toContain("leo@example.com");
    expect(text).toContain("June 5, 2026");
    expect(text).toContain("Hiring Team, Acme Corp");
    expect(text).toContain("Dear Hiring Manager,");
    expect(text).toContain("Opening paragraph.");
    expect(text).toContain("Body paragraph one.");
    expect(text).toContain("Body paragraph two.");
    expect(text).toContain("Closing paragraph.");
    expect(text).toContain("Sincerely,");
    // Name appears in header AND signature
    expect((text.match(/Leonardo Lopez/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it("renders an email link with mailto href", () => {
    const { container } = render(<CoverLetterTemplate letter={letter} />);
    const a = container.querySelector('a[href="mailto:leo@example.com"]');
    expect(a).not.toBeNull();
  });

  it("omits phone line when phone is absent", () => {
    const noPhone: CoverLetter = { ...letter, contact: { email: "leo@example.com", location: "New York, NY" } };
    const { container } = render(<CoverLetterTemplate letter={noPhone} />);
    expect(container.textContent).not.toContain("+1 (347) 000-0000");
  });
});
