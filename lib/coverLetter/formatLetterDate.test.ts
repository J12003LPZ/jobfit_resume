import { describe, it, expect } from "vitest";
import { formatLetterDate } from "./formatLetterDate";

describe("formatLetterDate", () => {
  it("formats as 'Month D, YYYY' in a stable timezone", () => {
    // Use UTC noon so the date is timezone-stable across CI machines.
    const d = new Date("2026-06-05T12:00:00Z");
    expect(formatLetterDate(d)).toBe("June 5, 2026");
  });

  it("does not zero-pad the day", () => {
    const d = new Date("2026-01-09T12:00:00Z");
    expect(formatLetterDate(d)).toBe("January 9, 2026");
  });
});
