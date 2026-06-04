import { describe, it, expect } from "vitest";
import { removeDuplicates } from "./removeDuplicates";

describe("removeDuplicates", () => {
  it("removes case/alias duplicates, keeps first display form", () => {
    expect(removeDuplicates(["React", "reactjs", "TypeScript", "ts"])).toEqual([
      "React",
      "TypeScript",
    ]);
  });
  it("drops empty entries", () => {
    expect(removeDuplicates(["React", "  ", ""])).toEqual(["React"]);
  });
});
