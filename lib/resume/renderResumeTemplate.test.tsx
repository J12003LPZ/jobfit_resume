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

  it("renders contact links as clickable anchors with absolute hrefs", () => {
    render(<ResumeTemplate resume={leonardoProfile} />);

    const linkedin = screen.getByText("linkedin.com/in/leonardo-jeziel-lopez");
    expect(linkedin.closest("a")).toHaveAttribute(
      "href",
      "https://linkedin.com/in/leonardo-jeziel-lopez",
    );

    const portfolio = screen.getByText("https://portfolio-leonardo-lopez.vercel.app/");
    expect(portfolio.closest("a")).toHaveAttribute(
      "href",
      "https://portfolio-leonardo-lopez.vercel.app/",
    );

    const email = screen.getByText("leonardojeziellopez@gmail.com");
    expect(email.closest("a")).toHaveAttribute(
      "href",
      "mailto:leonardojeziellopez@gmail.com",
    );
  });
});
