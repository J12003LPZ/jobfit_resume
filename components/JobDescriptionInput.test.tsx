import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { JobDescriptionInput } from "./JobDescriptionInput";

const baseProps = {
  mode: "text" as const,
  value: "",
  url: "",
  onChange: vi.fn(),
  onUrlChange: vi.fn(),
  onModeChange: vi.fn(),
  onAnalyze: vi.fn(),
  onClear: vi.fn(),
  loading: false,
};

describe("JobDescriptionInput", () => {
  it("shows the textarea in text mode", () => {
    render(<JobDescriptionInput {...baseProps} />);
    expect(screen.getByPlaceholderText(/paste the .*job description/i)).toBeTruthy();
  });

  it("shows a URL field in url mode", () => {
    render(<JobDescriptionInput {...baseProps} mode="url" />);
    expect(screen.getByPlaceholderText(/https:\/\//i)).toBeTruthy();
  });

  it("calls onModeChange when the URL tab is clicked", () => {
    const onModeChange = vi.fn();
    render(<JobDescriptionInput {...baseProps} onModeChange={onModeChange} />);
    fireEvent.click(screen.getByRole("button", { name: /paste a url/i }));
    expect(onModeChange).toHaveBeenCalledWith("url");
  });

  it("disables Analyze when the active field is empty", () => {
    render(<JobDescriptionInput {...baseProps} mode="url" url="" />);
    const analyze = screen.getByRole("button", { name: /analyze job/i });
    expect((analyze as HTMLButtonElement).disabled).toBe(true);
  });
});
