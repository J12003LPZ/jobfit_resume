import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CoverLetterExportButtons } from "./CoverLetterExportButtons";
import type { CoverLetter } from "@/types/coverLetter";

// Mock the PDF export so tests don't invoke jsPDF (browser-only)
vi.mock("@/lib/coverLetter/exportToPdf", () => ({
  exportCoverLetterToPdf: vi.fn().mockResolvedValue(undefined),
}));
import { exportCoverLetterToPdf } from "@/lib/coverLetter/exportToPdf";

const letter: CoverLetter = {
  candidateName: "Leonardo Lopez",
  contact: { email: "leo@example.com", location: "New York, NY" },
  date: "June 5, 2026",
  recipient: "Hiring Team, Acme Corp",
  jobTitle: "Frontend Developer",
  greeting: "Dear Hiring Manager,",
  opening: "Opening.",
  body: ["Body."],
  closing: "Closing.",
};

describe("CoverLetterExportButtons", () => {
  afterEach(() => vi.clearAllMocks());

  it("copies the plain-text letter to the clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<CoverLetterExportButtons letter={letter} onRegenerate={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /copy text/i }));
    expect(writeText).toHaveBeenCalledOnce();
    expect(writeText.mock.calls[0][0]).toContain("Dear Hiring Manager,");
  });

  it("fires onRegenerate when Regenerate is clicked", async () => {
    const onRegenerate = vi.fn();
    render(<CoverLetterExportButtons letter={letter} onRegenerate={onRegenerate} />);
    await userEvent.click(screen.getByRole("button", { name: /regenerate/i }));
    expect(onRegenerate).toHaveBeenCalledOnce();
  });

  it("calls exportCoverLetterToPdf when Download PDF is clicked", async () => {
    render(<CoverLetterExportButtons letter={letter} onRegenerate={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /download pdf/i }));
    expect(exportCoverLetterToPdf).toHaveBeenCalledWith(letter);
  });
});
