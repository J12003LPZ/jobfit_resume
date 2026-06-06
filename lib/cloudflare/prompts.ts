import type { Profile } from "@/types/profile";
import type { JobAnalysis } from "@/types/job";
import type { CoverLetterContent } from "@/types/coverLetter";
import { normalizeKeyword } from "@/lib/matching/normalizeKeyword";

export const ANALYZE_JOB_SYSTEM = `You extract structured job requirements from a job description.
Return ONLY valid JSON matching the provided schema. Do not explain.
Do not invent skills that are not present or clearly implied by the description.
Split items into: technologies (languages/frameworks/tools), hardSkills (technical abilities),
softSkills (interpersonal), responsibilities (duties), preferredQualifications (nice-to-haves),
and atsKeywords (the most important terms an ATS would scan for).

atsKeywords MUST be short, scannable noun phrases (1-4 words), e.g. "React",
"REST APIs", "unit testing", "Agile". NEVER put a full sentence or a verbatim
responsibility line in atsKeywords — distill it to the underlying skill/term
instead (e.g. "Collaborate with team members to design features" -> "collaboration",
"feature design"). Keep responsibilities as the full duty sentences; keep
atsKeywords terse.`;

export function analyzeJobUser(jobDescription: string): string {
  return `Job description:\n\n${jobDescription}`;
}

export const GENERATE_RESUME_SYSTEM = `You are an ATS resume-tailoring assistant.
Return ONLY valid JSON matching the provided schema. No markdown, no commentary.

The candidate's PROFESSIONAL EXPERIENCE and EDUCATION are FIXED master records.
You MUST NOT invent, reword, reorder, expand, shorten, or otherwise edit them. The
application copies experience and education verbatim from the profile, so anything
you output for those sections is ignored.

YOUR JOB has exactly two parts:
1. PROFESSIONAL SUMMARY — Write a sharp 3-4 sentence summary tailored to align as
   closely as possible with the target job. Use the job's own terminology and mirror
   its title, required technologies, responsibilities, and ATS keywords — but ONLY
   claim experience and abilities that are truthfully supported by the candidate's
   real profile (their experience, skills, and accepted gap keywords). Lead with the
   candidate's strongest job-relevant qualifications. Write in third person with no
   "I". Avoid clichés: "team player", "results-driven", "go-getter", "synergy",
   "detail-oriented", "self-starter", "rockstar", "ninja", "guru".
2. SKILLS — Curate and order the skills list to surface the keywords this job scans
   for that the candidate genuinely has. You may append the "accepted gap keywords".
   Never duplicate a skill.

Accepted gap keywords may appear in the summary phrasing and the skills list, but must
NEVER be presented as a concrete past achievement.`;

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
        "Write a PROFESSIONAL SUMMARY that matches the jobAnalysis as closely as the candidate's real background truthfully allows, and curate the skills list. The experience and education in candidateProfile are fixed — do not modify them.",
    },
    null,
    2
  );
}

export const COVER_LETTER_SYSTEM = `You are an ATS cover-letter assistant.
Return ONLY valid JSON matching the provided schema. No markdown, no commentary.

The candidate's facts (name, employers, titles, dates, education, metrics) are a
FIXED master record. You MUST NOT invent or alter any of them. Only claim
experience and abilities truthfully supported by the candidate's real profile
(their experience, skills, and accepted gap keywords).

Write a focused, professional cover letter in FIRST PERSON ("I"), about 300-350
words, as four JSON fields:
1. greeting — a salutation. Use "Dear Hiring Manager," unless a better generic
   salutation fits. Never invent a person's name.
2. opening — one short paragraph naming the target role and leading with the
   candidate's single strongest job-relevant qualification.
3. body — 2 to 3 short paragraphs that EXPLICITLY connect the candidate's REAL
   experience, projects, and skills to the job's responsibilities and required
   skills. Cover SEVERAL distinct strengths from the candidate's background
   (e.g. backend and REST APIs, database design and SQL optimization,
   full-stack delivery, automation, problem solving, and Agile collaboration /
   code review) — do NOT build the whole letter around one technology.
4. closing — one short paragraph with a courteous call to action. Do NOT sign
   off with a name; the application appends the signature.

COVERAGE: You are given "keywordsToWeave", the terms this job is scanned for.
Incorporate as MANY of them as the candidate's real background genuinely
supports, using each term's own wording, distributed naturally across the
letter. Never force a keyword the candidate cannot truthfully back up.

Accepted gap keywords may be mentioned as genuine interest or current learning,
but NEVER as a past achievement or as something already delivered.

Avoid clichés: "team player", "results-driven", "go-getter", "synergy",
"detail-oriented", "self-starter", "rockstar", "ninja", "guru", "hard worker",
"think outside the box".`;

// Dedupe keyword sources by normalized form, preserving the first spelling.
function dedupeKeywords(lists: string[][]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const kw of lists.flat()) {
    const trimmed = kw?.trim();
    if (!trimmed) continue;
    const norm = normalizeKeyword(trimmed);
    if (!norm || seen.has(norm)) continue;
    seen.add(norm);
    out.push(trimmed);
  }
  return out;
}

export function coverLetterUser(args: {
  profile: Profile;
  jobAnalysis: JobAnalysis;
  matchedKeywords: string[];
  acceptedGapKeywords: string[];
  // Present only on a coverage retry:
  priorContent?: CoverLetterContent;
  mustCover?: string[];
}): string {
  const keywordsToWeave = dedupeKeywords([
    args.matchedKeywords,
    args.acceptedGapKeywords,
    args.jobAnalysis.technologies,
    args.jobAnalysis.hardSkills,
    args.jobAnalysis.softSkills,
    args.jobAnalysis.atsKeywords,
  ]);

  const isRetry =
    !!args.priorContent && !!args.mustCover && args.mustCover.length > 0;

  const payload: Record<string, unknown> = {
    candidateProfile: args.profile,
    jobAnalysis: args.jobAnalysis,
    matchedKeywords: args.matchedKeywords,
    acceptedGapKeywords: args.acceptedGapKeywords,
    keywordsToWeave,
    instruction: isRetry
      ? "Revise previousDraft into an improved cover letter. Keep every keyword it already covers, and additionally weave in the mustCover keywords wherever the candidate's real background genuinely supports them, using each term's own wording. Keep it first person, about 300-350 words, truthful, and free of clichés. Return the full greeting, opening, body, and closing."
      : "Write greeting, opening, body (2-3 paragraphs), and closing for a first-person cover letter of about 300-350 words. Map the candidate's real experience and skills to this job's responsibilities and incorporate as many keywordsToWeave as the candidate's background genuinely supports, using each term's own wording and spreading the evidence across several different strengths. Do not invent facts and do not center the whole letter on one technology.",
  };

  if (isRetry) {
    payload.previousDraft = args.priorContent;
    payload.mustCover = args.mustCover;
  }

  return JSON.stringify(payload, null, 2);
}
