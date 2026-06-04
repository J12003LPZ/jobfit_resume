import { describe, it, expect } from "vitest";
import { extractTextFromHtml } from "./extractTextFromHtml";

describe("extractTextFromHtml", () => {
  it("strips tags and returns visible text", () => {
    const html = "<h1>Senior Engineer</h1><p>Build <b>great</b> things</p>";
    expect(extractTextFromHtml(html)).toBe("Senior Engineer Build great things");
  });

  it("drops script and style contents", () => {
    const html =
      "<style>.a{color:red}</style><p>Keep me</p><script>alert(1)</script>";
    expect(extractTextFromHtml(html)).toBe("Keep me");
  });

  it("decodes common entities", () => {
    expect(extractTextFromHtml("<p>R&amp;D &lt;ops&gt; &nbsp;team</p>")).toBe(
      "R&D <ops> team",
    );
  });

  it("collapses whitespace across newlines", () => {
    expect(extractTextFromHtml("<p>a</p>\n\n   <p>b</p>")).toBe("a b");
  });
});
