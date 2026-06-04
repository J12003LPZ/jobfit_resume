import type { Profile } from "@/types/profile";
import type { JobAnalysis } from "@/types/job";

export const ANALYZE_JOB_SYSTEM = `You extract structured job requirements from a job description.
Return ONLY valid JSON matching the provided schema. Do not explain.
Do not invent skills that are not present or clearly implied by the description.
Split items into: technologies (languages/frameworks/tools), hardSkills (technical abilities),
softSkills (interpersonal), responsibilities (duties), preferredQualifications (nice-to-haves),
and atsKeywords (the most important terms an ATS would scan for).`;

export function analyzeJobUser(jobDescription: string): string {
  return `Job description:\n\n${jobDescription}`;
}

export const GENERATE_RESUME_SYSTEM = `You are an ATS resume-tailoring assistant.
Generate an ATS-friendly resume as JSON matching the provided schema.

HARD RULES:
- Do NOT create fake companies, job titles, degrees, schools, or dates.
- Copy companies, roles, dates, schools, degrees, gpa, and honors VERBATIM from the candidate profile.
- You may rewrite the summary and experience/project bullets to align with the job, but only using
  facts supported by the profile.
- "Accepted gap keywords" may be added to the skills array and woven into the summary phrasing ONLY.
  Never present an accepted gap keyword as a concrete past achievement in an experience bullet.
- Avoid clichés: "team player", "results-driven", "go-getter", "synergy", "rockstar", etc.
- Return ONLY valid JSON. No markdown, no commentary.`;

export function generateResumeUser(args: {
  profile: Profile;
  jobAnalysis: JobAnalysis;
  matchedKeywords: string[];
  acceptedGapKeywords: string[];
}): string {
  return JSON.stringify(
    {
      candidateProfile: args.profile,
      jobAnalysis: args.jobAnalysis,
      matchedKeywords: args.matchedKeywords,
      acceptedGapKeywords: args.acceptedGapKeywords,
      instruction:
        "Tailor the summary and bullets to the jobAnalysis. Add acceptedGapKeywords to skills only.",
    },
    null,
    2
  );
}
