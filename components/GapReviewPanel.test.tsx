import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GapReviewPanel } from "./GapReviewPanel";

describe("GapReviewPanel", () => {
  it("fires onAcceptAll when 'Accept All Gaps' clicked", async () => {
    const onAcceptAll = vi.fn();
    render(
      <GapReviewPanel
        gapKeywords={["React", "AWS"]}
        gapMode="verified_only"
        acceptedKeywords={[]}
        onAcceptAll={onAcceptAll}
        onVerifiedOnly={vi.fn()}
        onCustomize={vi.fn()}
        onToggleKeyword={vi.fn()}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /accept all gaps/i }));
    expect(onAcceptAll).toHaveBeenCalledOnce();
  });
});
