import { describe, it, expect } from "vitest";
import { compareKeywords } from "./compareKeywords";

describe("compareKeywords", () => {
  it("splits job keywords into matched and gap using profile set", () => {
    const job = ["React", "AWS", "TypeScript", "Docker"];
    const profile = ["typescript", "sql", "debugging"];
    const result = compareKeywords(job, profile);
    expect(result.matched).toEqual(["TypeScript"]);
    expect(result.gap).toEqual(["React", "AWS", "Docker"]);
  });

  it("matches across aliases (React.js vs React)", () => {
    const result = compareKeywords(["React.js"], ["react"]);
    expect(result.matched).toEqual(["React.js"]);
    expect(result.gap).toEqual([]);
  });

  it("preserves original display casing of job keywords", () => {
    const result = compareKeywords(["JavaScript"], ["javascript"]);
    expect(result.matched).toEqual(["JavaScript"]);
  });
});
