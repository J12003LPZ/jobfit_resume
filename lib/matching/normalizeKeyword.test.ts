import { describe, it, expect } from "vitest";
import { normalizeKeyword } from "./normalizeKeyword";

describe("normalizeKeyword", () => {
  it("lowercases, trims, collapses whitespace", () => {
    expect(normalizeKeyword("  React   Native ")).toBe("react native");
  });
  it("strips surrounding punctuation", () => {
    expect(normalizeKeyword("Node.js,")).toBe("node.js");
  });
  it("applies aliases", () => {
    expect(normalizeKeyword("ReactJS")).toBe("react");
    expect(normalizeKeyword("React.js")).toBe("react");
    expect(normalizeKeyword("nodejs")).toBe("node.js");
    expect(normalizeKeyword("Postgres")).toBe("postgresql");
    expect(normalizeKeyword("JS")).toBe("javascript");
    expect(normalizeKeyword("TS")).toBe("typescript");
    expect(normalizeKeyword("RESTful API")).toBe("rest apis");
    expect(normalizeKeyword("CI/CD")).toBe("cicd");
  });
  it("returns empty string for empty input", () => {
    expect(normalizeKeyword("   ")).toBe("");
  });
});
