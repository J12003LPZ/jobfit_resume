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
    expect(json.resume.summary).toBe("Tailored summary.");
    expect(Array.isArray(json.validation.checks)).toBe(true);
  });

  it("keeps experience and education verbatim, ignoring any AI edits", async () => {
    // A model that tries to rewrite experience/education must have no effect.
    (callWorkersAI as any).mockResolvedValue({
      ...leonardoProfile,
      summary: "Tailored summary.",
      experience: [
        {
          company: "Fabricated Corp",
          role: "Senior Staff Engineer",
          dates: "2010 – Present",
          bullets: ["Invented a bullet that is not in the profile."],
        },
      ],
      education: [
        { school: "Fake University", degree: "PhD in Everything" },
      ],
    });
    const res = await POST(req(validBody));
    const json = await res.json();
    expect(json.resume.experience).toEqual(leonardoProfile.experience);
    expect(json.resume.education).toEqual(leonardoProfile.education);
  });
});
