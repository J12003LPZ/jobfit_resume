import { describe, it, expect, vi, afterEach } from "vitest";
import { leonardoProfile } from "@/data/leonardo-profile";

vi.mock("@/lib/cloudflare/callWorkersAI", () => ({ callWorkersAI: vi.fn() }));
import { callWorkersAI } from "@/lib/cloudflare/callWorkersAI";
import { POST } from "./route";

function req(body: unknown) {
  return new Request("http://localhost/api/generate-resume", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const validBody = {
  jobAnalysis: {
    jobTitle: "Frontend Developer",
    technologies: ["React"], hardSkills: [], softSkills: [],
    responsibilities: [], preferredQualifications: [], atsKeywords: [],
  },
  matchedKeywords: ["TypeScript"],
  acceptedGapKeywords: ["React"],
};

describe("POST /api/generate-resume", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns 400 when jobAnalysis is missing", async () => {
    const res = await POST(req({ matchedKeywords: [] }));
    expect(res.status).toBe(400);
  });

  it("returns the generated resume plus validation checks", async () => {
    (callWorkersAI as any).mockResolvedValue({ ...leonardoProfile, summary: "Tailored summary." });
    const res = await POST(req(validBody));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.resume.name).toBe("Leonardo Lopez");
    expect(Array.isArray(json.validation.checks)).toBe(true);
  });
});
