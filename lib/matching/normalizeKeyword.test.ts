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

describe("expanded aliases", () => {
  it.each([
    ["NextJS", "next.js"],
    ["Next JS", "next.js"],
    ["next js", "next.js"],
    ["VueJS", "vue.js"],
    ["Vue", "vue.js"],
    ["ExpressJS", "express.js"],
    ["Express", "express.js"],
    ["Golang", "go"],
    ["K8s", "kubernetes"],
    ["MSSQL", "sql server"],
    ["MS SQL", "sql server"],
    ["Amazon Web Services", "aws"],
    ["Google Cloud Platform", "gcp"],
    ["Google Cloud", "gcp"],
    ["TailwindCSS", "tailwind css"],
    ["Tailwind", "tailwind css"],
    ["unit tests", "unit testing"],
    ["unit test", "unit testing"],
  ])("normalizes %s -> %s", (input, expected) => {
    expect(normalizeKeyword(input)).toBe(expected);
  });

  it("normalizes the spelled-out form to the same value as its alias", () => {
    // Canonical targets that end in "s" (kubernetes, node.js) must not be
    // plural-folded, or the alias and the spelled-out form would diverge.
    expect(normalizeKeyword("Kubernetes")).toBe(normalizeKeyword("K8s"));
    expect(normalizeKeyword("Node.js")).toBe(normalizeKeyword("NodeJS"));
  });
});

describe("plural folding", () => {
  it("folds simple plurals so 'databases' matches 'database'", () => {
    expect(normalizeKeyword("databases")).toBe(normalizeKeyword("database"));
  });
  it("folds 'microservices' to match 'microservice'", () => {
    expect(normalizeKeyword("microservices")).toBe(normalizeKeyword("microservice"));
  });
  it("does not fold short tokens like 'css'", () => {
    expect(normalizeKeyword("css")).toBe("css");
  });
  it("does not fold double-s endings like 'access'", () => {
    expect(normalizeKeyword("access")).toBe("access");
  });
  it("still maps plural aliases: 'REST APIs' -> 'rest apis'", () => {
    expect(normalizeKeyword("REST APIs")).toBe("rest apis");
  });
});
