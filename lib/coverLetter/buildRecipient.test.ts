import { describe, it, expect } from "vitest";
import { buildRecipient } from "./buildRecipient";

describe("buildRecipient", () => {
  it("includes the company when provided", () => {
    expect(buildRecipient("Acme Corp")).toBe("Hiring Team, Acme Corp");
  });

  it("falls back to a generic recipient when company is missing", () => {
    expect(buildRecipient(undefined)).toBe("Hiring Team");
    expect(buildRecipient("")).toBe("Hiring Team");
    expect(buildRecipient("   ")).toBe("Hiring Team");
  });
});
