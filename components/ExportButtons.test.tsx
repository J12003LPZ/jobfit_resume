import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExportButtons } from "./ExportButtons";
import { leonardoProfile } from "@/data/leonardo-profile";

vi.mock("@/lib/resume/exportToPdf", () => ({
  exportResumeToPdf: vi.fn().mockResolvedValue(undefined),
}));

import { exportResumeToPdf } from "@/lib/resume/exportToPdf";

describe("ExportButtons", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls exportResumeToPdf with the resume on Download PDF", async () => {
    render(
      <ExportButtons resume={leonardoProfile} onRegenerate={() => {}} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Download PDF" }));
    expect(exportResumeToPdf).toHaveBeenCalledWith(leonardoProfile);
  });

  it("does not call window.print", async () => {
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});
    render(
      <ExportButtons resume={leonardoProfile} onRegenerate={() => {}} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Download PDF" }));
    expect(printSpy).not.toHaveBeenCalled();
  });
});
