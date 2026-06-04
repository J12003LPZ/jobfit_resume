import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("@/lib/cloudflare/callWorkersAI", () => ({
  callWorkersAI: vi.fn(),
}));
import { callWorkersAI } from "@/lib/cloudflare/callWorkersAI";
import { POST } from "./route";

function req(body: unknown) {
  return new Request("http://localhost/api/analyze-job", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/analyze-job", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns 400 when jobDescription is missing", async () => {
    const res = await POST(req({}));
    expect(res.status).toBe(400);
  });

  it("returns analysis + gap data for a valid request", async () => {
    (callWorkersAI as any).mockResolvedValue({
      jobTitle: "Frontend Developer",
      technologies: ["React", "TypeScript", "AWS"],
      hardSkills: ["debugging"],
      softSkills: ["communication"],
      responsibilities: ["build UIs"],
      preferredQualifications: [],
      atsKeywords: ["React", "Agile"],
    });
    const res = await POST(req({ jobDescription: "We need a React developer..." }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.analysis.jobTitle).toBe("Frontend Developer");
    expect(json.gap.gapKeywords).toEqual(expect.arrayContaining(["AWS"]));
    expect(typeof json.gap.matchScore).toBe("number");
  });
});
