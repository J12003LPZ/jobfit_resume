import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ResumeTemplate } from "./renderResumeTemplate";
import { leonardoProfile } from "@/data/leonardo-profile";

describe("ResumeTemplate", () => {
  it("renders name, all ATS section headings, and the print wrapper id", () => {
    const { container } = render(<ResumeTemplate resume={leonardoProfile} />);
    expect(screen.getByText("LEONARDO LOPEZ")).toBeInTheDocument();
    expect(screen.getByText("PROFESSIONAL SUMMARY")).toBeInTheDocument();
    expect(screen.getByText("TECHNICAL SKILLS")).toBeInTheDocument();
    expect(screen.getByText("PROFESSIONAL EXPERIENCE")).toBeInTheDocument();
    expect(screen.getByText("EDUCATION")).toBeInTheDocument();
    expect(container.querySelector("#resume-print")).not.toBeNull();
  });

  it("omits the Projects heading when there are no projects", () => {
    render(<ResumeTemplate resume={{ ...leonardoProfile, projects: [] }} />);
    expect(screen.queryByText("PROJECTS")).toBeNull();
  });
});
