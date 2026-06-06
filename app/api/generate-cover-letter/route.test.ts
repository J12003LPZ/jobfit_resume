import { describe, it, expect, vi, afterEach } from "vitest";
import { leonardoProfile } from "@/data/leonardo-profile";

vi.mock("@/lib/cloudflare/callWorkersAI", () => ({ callWorkersAI: vi.fn() }));
import { callWorkersAI } from "@/lib/cloudflare/callWorkersAI";
import { POST } from "./route";

function req(body: unknown) {
  return new Request("http://localhost/api/generate-cover-letter", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const validBody = {
  jobAnalysis: {
    jobTitle: "Frontend Developer",
    companyName: "Acme Corp",
    technologies: ["React"], hardSkills: [], softSkills: [],
    responsibilities: [], preferredQualifications: [], atsKeywords: [],
  },
  matchedKeywords: ["TypeScript"],
  acceptedGapKeywords: ["React"],
};

const proseFromModel = {
  greeting: "Dear Hiring Manager,",
  opening: "I am applying for the Frontend Developer role and build with React.",
  body: ["At my current role I shipped full-stack features."],
  closing: "Thank you for your consideration.",
};

describe("POST /api/generate-cover-letter", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns 400 when jobAnalysis is missing", async () => {
    const res = await POST(req({ matchedKeywords: [] }));
    expect(res.status).toBe(400);
  });

  it("returns the assembled letter and keyword coverage", async () => {
    (callWorkersAI as any).mockResolvedValue(proseFromModel);
    const res = await POST(req(validBody));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.coverLetter.opening).toContain("React");
    expect(json.coverLetter.body).toEqual(proseFromModel.body);
    expect(json.coverage.covered).toContain("React"); // job keyword present in prose
    expect(typeof json.coverage.coverageScore).toBe("number");
  });

  it("fills factual fields from the profile and job, never from the model", async () => {
    // A model that tries to smuggle fake identity fields must have no effect.
    (callWorkersAI as any).mockResolvedValue({
      ...proseFromModel,
      candidateName: "Fake Name",
      contact: { email: "evil@x.com", location: "Nowhere" },
      jobTitle: "CEO",
    });
    const res = await POST(req(validBody));
    const json = await res.json();
    expect(json.coverLetter.candidateName).toBe(leonardoProfile.name);
    expect(json.coverLetter.contact).toEqual(leonardoProfile.contact);
    expect(json.coverLetter.jobTitle).toBe("Frontend Developer");
    expect(json.coverLetter.recipient).toBe("Hiring Team, Acme Corp");
    expect(typeof json.coverLetter.date).toBe("string");
  });

  it("rejects GET", async () => {
    const { GET } = await import("./route");
    const res = await GET();
    expect(res.status).toBe(405);
  });
});

describe("POST /api/generate-cover-letter — coverage retry", () => {
  afterEach(() => vi.restoreAllMocks());

  const job = {
    jobTitle: "Full-Stack Engineer",
    companyName: "Acme Corp",
    technologies: ["React", "TypeScript", "Node.js"],
    hardSkills: ["REST APIs", "unit testing"],
    softSkills: ["communication", "collaboration"],
    responsibilities: [],
    preferredQualifications: [],
    atsKeywords: ["Automation", "Agile"],
  };
  const reqBody = { jobAnalysis: job, matchedKeywords: [], acceptedGapKeywords: [] };

  // Covers only React + REST APIs -> 2/9 = 22% (< 70 target).
  const lowDraft = {
    greeting: "Dear Hiring Manager,",
    opening: "I build with React.",
    body: ["I design REST APIs."],
    closing: "Thanks.",
  };
  // Covers all 9 keywords -> 100%.
  const highDraft = {
    greeting: "Dear Hiring Manager,",
    opening: "I build with React, TypeScript, and Node.js.",
    body: [
      "I design REST APIs and practice unit testing, with strong communication and collaboration.",
      "I also focus on Automation and work in an Agile team.",
    ],
    closing: "Thanks.",
  };

  it("retries once and keeps the higher-coverage draft", async () => {
    (callWorkersAI as any)
      .mockResolvedValueOnce(lowDraft)
      .mockResolvedValueOnce(highDraft);
    const res = await POST(req(reqBody));
    const json = await res.json();
    expect((callWorkersAI as any).mock.calls).toHaveLength(2);
    expect(json.coverLetter.body).toEqual(highDraft.body);
    expect(json.coverage.coverageScore).toBe(100); // highDraft covers all 9 keywords
  });

  it("does not retry when the first draft already meets target", async () => {
    (callWorkersAI as any).mockResolvedValueOnce(highDraft);
    const res = await POST(req(reqBody));
    const json = await res.json();
    expect((callWorkersAI as any).mock.calls).toHaveLength(1);
    expect(json.coverLetter.body).toEqual(highDraft.body);
  });

  it("keeps the first draft if the retry fails", async () => {
    (callWorkersAI as any)
      .mockResolvedValueOnce(lowDraft)
      .mockRejectedValueOnce(new Error("model down"));
    const res = await POST(req(reqBody));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.coverLetter.body).toEqual(lowDraft.body);
  });
});
