import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CoverLetterCoveragePanel } from "./CoverLetterCoveragePanel";

describe("CoverLetterCoveragePanel", () => {
  it("shows the coverage score and both keyword groups", () => {
    render(
      <CoverLetterCoveragePanel
        coverage={{ covered: ["React"], missing: ["AWS"], coverageScore: 50 }}
      />,
    );
    expect(screen.getByText(/50%/)).toBeInTheDocument();
    expect(screen.getByText("React")).toBeInTheDocument();
    expect(screen.getByText("AWS")).toBeInTheDocument();
  });
});
