import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("@/lib/cloudflare/callWorkersAI", () => ({
  callWorkersAI: vi.fn(),
}));
import { callWorkersAI } from "@/lib/cloudflare/callWorkersAI";

vi.mock("@/lib/jobs/fetchJobText", () => ({
  fetchJobText: vi.fn(),
}));
import { fetchJobText } from "@/lib/jobs/fetchJobText";

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

  it("returns 400 when neither jobDescription nor jobUrl is provided", async () => {
    const res = await POST(req({}));
    expect(res.status).toBe(400);
  });

  it("resolves jobUrl via fetchJobText and analyzes the fetched text", async () => {
    (fetchJobText as any).mockResolvedValue("We need a React developer with AWS");
    (callWorkersAI as any).mockResolvedValue({
      jobTitle: "Frontend Developer",
      technologies: ["React", "AWS"],
      hardSkills: [],
      softSkills: [],
      responsibilities: [],
      preferredQualifications: [],
      atsKeywords: ["React"],
    });
    const res = await POST(req({ jobUrl: "https://jobs.example.com/1" }));
    expect(res.status).toBe(200);
    expect(fetchJobText).toHaveBeenCalledWith("https://jobs.example.com/1");
    const json = await res.json();
    expect(json.analysis.jobTitle).toBe("Frontend Developer");
  });

  it("returns 422 when the URL cannot be fetched", async () => {
    (fetchJobText as any).mockRejectedValue(new Error("Could not load that URL."));
    const res = await POST(req({ jobUrl: "https://jobs.example.com/bad" }));
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error).toMatch(/could not load/i);
  });
});
