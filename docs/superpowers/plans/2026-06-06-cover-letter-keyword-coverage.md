# Cover Letter Quality & Keyword Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the generated cover letter richer (maps several real strengths, not just REST APIs) and dramatically raise its job-keyword coverage.

**Architecture:** Three layers work together. (1) The **prompt** is rewritten to write a longer letter, to receive an explicit `keywordsToWeave` target list, and to spread evidence across multiple experiences. (2) The **route** does a coverage-driven auto-retry: generate, score, and if below target spend exactly one extra AI call that feeds the still-missing keywords back to the model — keeping whichever draft scores higher. (3) The **coverage matcher** is made generous (hyphen↔space, plural/singular, aliases, word-order-independent multi-word matching) so genuinely-present concepts count.

**Tech Stack:** Next.js 16 (App Router) API routes, Cloudflare Workers AI (`callWorkersAI`), Zod schemas, Vitest.

---

## Background (what exists today)

- `app/api/generate-cover-letter/route.ts` — POST handler: calls `callWorkersAI` once with `COVER_LETTER_SYSTEM` + `coverLetterUser(...)`, parses with `coverLetterContentSchema`, assembles a `CoverLetter` (model prose + app-supplied facts), scores with `coverLetterCoverage`, returns `{ coverLetter, coverage }`.
- `lib/cloudflare/prompts.ts` — `COVER_LETTER_SYSTEM` (caps "250 words, 1–3 short paragraphs", passively "weave keywords"), and `coverLetterUser({profile, jobAnalysis, matchedKeywords, acceptedGapKeywords})` which JSON-stringifies a payload + instruction.
- `lib/matching/coverLetterCoverage.ts` — scores keyword presence with a raw `\bKEYWORD\b` case-insensitive regex, **no normalization** (so "Problem-solving" ≠ "problem solving", "REST" ≠ "REST APIs").
- `lib/matching/normalizeKeyword.ts` — existing `normalizeKeyword()` with an alias map (e.g. `rest`/`restful` → `rest apis`, `react.js` → `react`). We reuse it.
- `lib/matching/jobKeywords.ts` — `jobKeywordList(job)` = technologies + hardSkills + softSkills + atsKeywords. This is the coverage universe.
- Types: `types/coverLetter.ts` exports `CoverLetterContent` (greeting/opening/body/closing) and `CoverLetter`. `types/job.ts` exports `JobAnalysis`.

## Decisions locked in (from the requester)

- **Auto-retry:** yes — one extra AI call when coverage `< 70`.
- **Matcher:** generous — maximize matches; literal-fairness is not a concern (but keep whole-word boundaries so "AI" never matches inside "training").
- **Length:** ~300–350 words, 2–3 body paragraphs.

## File Structure

- `lib/matching/coverLetterCoverage.ts` — **Modify.** Replace literal matcher with a generous one (alias + hyphen/space + plural + word-order). Single responsibility: scoring.
- `lib/matching/coverLetterCoverage.test.ts` — **Modify.** Append a new `describe` for the generous cases. Existing tests stay green.
- `lib/cloudflare/prompts.ts` — **Modify.** Rewrite `COVER_LETTER_SYSTEM`; extend `coverLetterUser` to build `keywordsToWeave` and to support a retry (`priorContent` + `mustCover`).
- `lib/cloudflare/prompts.test.ts` — **Create.** Unit tests for `coverLetterUser` payload shape (dedup, retry fields).
- `app/api/generate-cover-letter/route.ts` — **Modify.** Factor an `assembleLetter` helper; add the coverage-driven one-shot retry loop.
- `app/api/generate-cover-letter/route.test.ts` — **Modify.** Append a `describe` for retry behavior.

**Test commands** (project scripts): full suite `npm test`; single file `npx vitest run <path>`; single test `npx vitest run <path> -t "<name>"`; lint `npm run lint`; types `npx tsc --noEmit`.

---

## Task 1: Generous coverage matcher

**Files:**
- Modify: `lib/matching/coverLetterCoverage.ts`
- Test: `lib/matching/coverLetterCoverage.test.ts`

- [ ] **Step 1: Write the failing tests**

Append this new top-level `describe` block to the **end** of `lib/matching/coverLetterCoverage.test.ts` (after the final `});` of the existing `describe`). The imports it needs (`coverLetterCoverage`, `JobAnalysis`, `CoverLetter`) are already imported at the top of the file.

```ts
describe("coverLetterCoverage — generous matching", () => {
  function job(overrides: Partial<JobAnalysis> = {}): JobAnalysis {
    return {
      jobTitle: "Engineer",
      technologies: [],
      hardSkills: [],
      softSkills: [],
      responsibilities: [],
      preferredQualifications: [],
      atsKeywords: [],
      ...overrides,
    };
  }
  function withProse(opening: string): CoverLetter {
    return {
      candidateName: "L",
      contact: { email: "a@b.com", location: "NYC" },
      date: "June 6, 2026",
      recipient: "Hiring Team",
      jobTitle: "Engineer",
      greeting: "Dear Hiring Manager,",
      opening,
      body: [],
      closing: "",
    };
  }

  it("matches across hyphen vs space", () => {
    const r = coverLetterCoverage(
      job({ softSkills: ["Problem-solving"] }),
      withProse("I enjoy problem solving every day."),
    );
    expect(r.covered).toEqual(["Problem-solving"]);
  });

  it("matches singular vs plural", () => {
    const r = coverLetterCoverage(
      job({ atsKeywords: ["Ecommerce platforms"] }),
      withProse("I built an ecommerce platform."),
    );
    expect(r.covered).toEqual(["Ecommerce platforms"]);
  });

  it("matches aliases (REST <-> REST APIs)", () => {
    const r = coverLetterCoverage(
      job({ atsKeywords: ["REST"] }),
      withProse("I designed REST APIs for the backend."),
    );
    expect(r.covered).toEqual(["REST"]);
  });

  it("matches multi-word keywords regardless of word order", () => {
    const r = coverLetterCoverage(
      job({ hardSkills: ["Algorithm optimization"] }),
      withProse("I focused on optimization of the core algorithm."),
    );
    expect(r.covered).toEqual(["Algorithm optimization"]);
  });

  it("still requires whole words (no substring matches)", () => {
    const r = coverLetterCoverage(
      job({ atsKeywords: ["AI"] }),
      withProse("I gained traction and remained patient."),
    );
    expect(r.missing).toEqual(["AI"]);
    expect(r.covered).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the new tests to verify they fail**

Run: `npx vitest run lib/matching/coverLetterCoverage.test.ts -t "generous matching"`
Expected: FAIL — the current literal matcher reports the hyphen/plural/alias/word-order keywords as `missing`, so `covered` is empty.

- [ ] **Step 3: Replace the matcher implementation**

Overwrite the entire contents of `lib/matching/coverLetterCoverage.ts` with:

```ts
import type { JobAnalysis } from "@/types/job";
import type { CoverLetter } from "@/types/coverLetter";
import { jobKeywordList } from "./jobKeywords";
import { normalizeKeyword } from "./normalizeKeyword";

export type CoverLetterCoverage = {
  covered: string[];
  missing: string[];
  coverageScore: number; // 0–100
};

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Connector words that need not be present for a multi-word keyword to count.
const STOPWORDS = new Set([
  "and", "or", "of", "the", "a", "an", "to", "with", "for", "in", "on",
]);

// Regex fragment for one token, tolerant of simple plural/singular:
// a trailing "s" on the keyword token is optional, and the prose may add one
// ("platform" <-> "platforms", "api" <-> "apis"). Only stem words longer than
// 3 chars so short tokens like "css"/"AI" are left intact.
function tokenPattern(token: string): string {
  const stem =
    token.length > 3 && token.toLowerCase().endsWith("s")
      ? token.slice(0, -1)
      : token;
  return `${escapeRegExp(stem)}s?`;
}

function splitTokens(form: string): string[] {
  return form.split(/[\s\-/]+/).filter(Boolean);
}

// Candidate spellings for a keyword: the raw form plus the alias-normalized form
// (so "REST"/"RESTful" both reach "rest apis" and either spelling in the letter
// counts). Matching is case-insensitive, so casing of these forms is irrelevant.
function surfaceForms(keyword: string): string[] {
  const forms = new Set<string>();
  const raw = keyword.trim();
  if (raw) forms.add(raw);
  const norm = normalizeKeyword(keyword);
  if (norm) forms.add(norm);
  return [...forms];
}

// A surface form is present when its words appear contiguously (separators
// flexible: space / hyphen / slash) OR — for multi-word forms — when all of its
// significant words appear anywhere in the prose, in any order. Whole-word
// boundaries are always required, so "AI" never matches inside "training".
function formPresent(form: string, prose: string): boolean {
  const tokens = splitTokens(form);
  if (tokens.length === 0) return false;

  const phrase = new RegExp(
    `\\b${tokens.map(tokenPattern).join("[\\s\\-/]+")}\\b`,
    "i",
  );
  if (phrase.test(prose)) return true;

  const significant = tokens.filter((t) => !STOPWORDS.has(t.toLowerCase()));
  if (significant.length >= 2) {
    return significant.every((t) =>
      new RegExp(`\\b${tokenPattern(t)}\\b`, "i").test(prose),
    );
  }
  return false;
}

function isCovered(keyword: string, prose: string): boolean {
  return surfaceForms(keyword).some((f) => formPresent(f, prose));
}

// Generous, case-insensitive presence of each job keyword in the letter prose
// (opening + body + closing). Tolerates hyphen/space, plural/singular, aliases,
// and word order so a genuinely-present concept is not scored as missing. The
// greeting is excluded (fixed salutation); responsibilities are never in
// jobKeywordList, so they cannot affect the result.
export function coverLetterCoverage(
  job: JobAnalysis,
  letter: CoverLetter,
): CoverLetterCoverage {
  const prose = [letter.opening, ...letter.body, letter.closing].join(" ");

  // Dedupe by lowercased form, keep the first original spelling for display.
  const seen = new Set<string>();
  const universe: string[] = [];
  for (const kw of jobKeywordList(job)) {
    const key = kw.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    universe.push(kw.trim());
  }

  const covered: string[] = [];
  const missing: string[] = [];
  for (const kw of universe) {
    (isCovered(kw, prose) ? covered : missing).push(kw);
  }

  const coverageScore =
    universe.length === 0
      ? 0
      : Math.round((covered.length / universe.length) * 100);

  return { covered, missing, coverageScore };
}
```

- [ ] **Step 4: Run the whole coverage test file to verify all pass**

Run: `npx vitest run lib/matching/coverLetterCoverage.test.ts`
Expected: PASS — the new generous cases pass AND the four pre-existing cases (literal-present, absent→20%, whole-word, ignore-greeting, empty→0) still pass. (The "lists keywords absent" case still scores 20 because only "React" appears; "ignores greeting" still yields `covered: []` because the greeting is not part of `prose`.)

- [ ] **Step 5: Commit**

```bash
git add lib/matching/coverLetterCoverage.ts lib/matching/coverLetterCoverage.test.ts
git commit -m "feat: generous cover-letter keyword coverage matching"
```

---

## Task 2: Prompt — keyword target list, richer letter, retry support

**Files:**
- Create: `lib/cloudflare/prompts.test.ts`
- Modify: `lib/cloudflare/prompts.ts`

- [ ] **Step 1: Write the failing tests**

Create `lib/cloudflare/prompts.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { coverLetterUser } from "./prompts";
import { leonardoProfile } from "@/data/leonardo-profile";
import type { JobAnalysis } from "@/types/job";

const job: JobAnalysis = {
  jobTitle: "Full-Stack Engineer",
  technologies: ["React", "react.js", "Node.js"], // react.js dups React after normalize
  hardSkills: ["REST APIs"],
  softSkills: ["communication"],
  responsibilities: ["ship features"],
  preferredQualifications: [],
  atsKeywords: ["Automation"],
};

describe("coverLetterUser", () => {
  it("builds a de-duplicated keywordsToWeave list across all sources", () => {
    const out = JSON.parse(
      coverLetterUser({
        profile: leonardoProfile,
        jobAnalysis: job,
        matchedKeywords: ["TypeScript"],
        acceptedGapKeywords: ["Agile"],
      }),
    );
    const kw: string[] = out.keywordsToWeave;
    expect(kw).toEqual(
      expect.arrayContaining([
        "TypeScript", "Agile", "React", "Node.js",
        "REST APIs", "communication", "Automation",
      ]),
    );
    // "react.js" collapses into "React" — only one react* survives.
    const reactish = kw.filter((k) => k.toLowerCase().startsWith("react"));
    expect(reactish).toHaveLength(1);
    // No retry fields on a first-pass call.
    expect(out.previousDraft).toBeUndefined();
    expect(out.mustCover).toBeUndefined();
  });

  it("includes previousDraft + mustCover with a revision instruction on retry", () => {
    const prior = {
      greeting: "Dear Hiring Manager,",
      opening: "o",
      body: ["b"],
      closing: "c",
    };
    const out = JSON.parse(
      coverLetterUser({
        profile: leonardoProfile,
        jobAnalysis: job,
        matchedKeywords: [],
        acceptedGapKeywords: [],
        priorContent: prior,
        mustCover: ["Automation", "communication"],
      }),
    );
    expect(out.previousDraft).toEqual(prior);
    expect(out.mustCover).toEqual(["Automation", "communication"]);
    expect(out.instruction.toLowerCase()).toContain("revise");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run lib/cloudflare/prompts.test.ts`
Expected: FAIL — `out.keywordsToWeave` is `undefined` (current `coverLetterUser` does not emit it) and the function rejects the `priorContent`/`mustCover` args (TypeScript error / no such fields).

- [ ] **Step 3a: Update imports at the top of `lib/cloudflare/prompts.ts`**

Replace the existing top import lines:

```ts
import type { Profile } from "@/types/profile";
import type { JobAnalysis } from "@/types/job";
```

with:

```ts
import type { Profile } from "@/types/profile";
import type { JobAnalysis } from "@/types/job";
import type { CoverLetterContent } from "@/types/coverLetter";
import { normalizeKeyword } from "@/lib/matching/normalizeKeyword";
```

- [ ] **Step 3b: Rewrite `COVER_LETTER_SYSTEM`**

Replace the entire existing `export const COVER_LETTER_SYSTEM = \`...\`;` block with:

```ts
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
```

- [ ] **Step 3c: Replace `coverLetterUser` (and add the dedupe helper)**

Replace the entire existing `export function coverLetterUser(...) { ... }` at the bottom of `lib/cloudflare/prompts.ts` with:

```ts
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run lib/cloudflare/prompts.test.ts`
Expected: PASS — both `coverLetterUser` cases pass.

- [ ] **Step 5: Commit**

```bash
git add lib/cloudflare/prompts.ts lib/cloudflare/prompts.test.ts
git commit -m "feat: richer cover-letter prompt with keywordsToWeave + retry support"
```

---

## Task 3: Route — coverage-driven one-shot retry

**Files:**
- Modify: `app/api/generate-cover-letter/route.ts`
- Test: `app/api/generate-cover-letter/route.test.ts`

- [ ] **Step 1: Write the failing tests**

Append this new top-level `describe` to the **end** of `app/api/generate-cover-letter/route.test.ts` (after the final `});`). It reuses the `req` helper, the mocked `callWorkersAI`, and `POST` already imported at the top of the file.

```ts
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
    expect(json.coverage.coverageScore).toBeGreaterThan(50);
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run app/api/generate-cover-letter/route.test.ts -t "coverage retry"`
Expected: FAIL — current route calls `callWorkersAI` exactly once, so the "retries once" case sees `mock.calls` length 1 and `coverLetter.body` equals `lowDraft.body`.

- [ ] **Step 3: Add the retry loop to the route**

Overwrite the entire contents of `app/api/generate-cover-letter/route.ts` with:

```ts
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { callWorkersAI } from "@/lib/cloudflare/callWorkersAI";
import { COVER_LETTER_SYSTEM, coverLetterUser } from "@/lib/cloudflare/prompts";
import { coverLetterContentJsonSchema } from "@/lib/cloudflare/jsonSchemas";
import { coverLetterContentSchema } from "@/schemas/cover-letter.schema";
import { coverLetterCoverage } from "@/lib/matching/coverLetterCoverage";
import { formatLetterDate } from "@/lib/coverLetter/formatLetterDate";
import { buildRecipient } from "@/lib/coverLetter/buildRecipient";
import { leonardoProfile } from "@/data/leonardo-profile";
import type { JobAnalysis } from "@/types/job";
import type { CoverLetter, CoverLetterContent } from "@/types/coverLetter";

export const maxDuration = 300;

// Below this coverage score we spend ONE extra AI call trying to weave in the
// keywords the first draft missed. One retry only — bounds latency and cost.
const COVERAGE_TARGET = 70;

// Reassemble the letter: model prose + authoritative facts copied verbatim.
// The model never controls identity, contact, company, or the job title.
function assembleLetter(
  content: CoverLetterContent,
  jobAnalysis: JobAnalysis,
): CoverLetter {
  return {
    candidateName: leonardoProfile.name,
    contact: leonardoProfile.contact,
    date: formatLetterDate(new Date()),
    recipient: buildRecipient(jobAnalysis.companyName),
    jobTitle: jobAnalysis.jobTitle,
    greeting: content.greeting,
    opening: content.opening,
    body: content.body,
    closing: content.closing,
  };
}

export async function POST(request: Request) {
  let body: {
    jobAnalysis?: JobAnalysis;
    matchedKeywords?: string[];
    acceptedGapKeywords?: string[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.jobAnalysis || typeof body.jobAnalysis.jobTitle !== "string") {
    return NextResponse.json({ error: "Missing jobAnalysis" }, { status: 400 });
  }
  const jobAnalysis = body.jobAnalysis;
  const matchedKeywords = body.matchedKeywords ?? [];
  const acceptedGapKeywords = body.acceptedGapKeywords ?? [];

  try {
    const raw = await callWorkersAI<unknown>({
      system: COVER_LETTER_SYSTEM,
      user: coverLetterUser({
        profile: leonardoProfile,
        jobAnalysis,
        matchedKeywords,
        acceptedGapKeywords,
      }),
      jsonSchema: coverLetterContentJsonSchema,
    });

    const content = coverLetterContentSchema.parse(raw);
    let coverLetter = assembleLetter(content, jobAnalysis);
    let coverage = coverLetterCoverage(jobAnalysis, coverLetter);

    // One coverage-driven retry: feed the missing keywords + prior draft back
    // to the model, and keep whichever draft scores higher. Any failure here
    // silently falls back to the first draft.
    if (coverage.coverageScore < COVERAGE_TARGET && coverage.missing.length > 0) {
      try {
        const raw2 = await callWorkersAI<unknown>({
          system: COVER_LETTER_SYSTEM,
          user: coverLetterUser({
            profile: leonardoProfile,
            jobAnalysis,
            matchedKeywords,
            acceptedGapKeywords,
            priorContent: content,
            mustCover: coverage.missing,
          }),
          jsonSchema: coverLetterContentJsonSchema,
        });
        const content2 = coverLetterContentSchema.parse(raw2);
        const letter2 = assembleLetter(content2, jobAnalysis);
        const coverage2 = coverLetterCoverage(jobAnalysis, letter2);
        if (coverage2.coverageScore > coverage.coverageScore) {
          coverLetter = letter2;
          coverage = coverage2;
        }
      } catch {
        // Keep the first draft if the retry fails.
      }
    }

    return NextResponse.json({ coverLetter, coverage });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: "The model returned an unexpected cover-letter shape. Please try again." },
        { status: 502 },
      );
    }
    const message = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
```

- [ ] **Step 4: Run the full route test file to verify all pass**

Run: `npx vitest run app/api/generate-cover-letter/route.test.ts`
Expected: PASS — the three new retry cases pass, and the four pre-existing cases still pass (the existing tests use a job whose only keyword is "React", which `proseFromModel` covers → 100% → no retry → one call).

- [ ] **Step 5: Commit**

```bash
git add app/api/generate-cover-letter/route.ts app/api/generate-cover-letter/route.test.ts
git commit -m "feat: coverage-driven retry for cover-letter generation"
```

---

## Task 4: Full verification

**Files:** none (verification only).

- [ ] **Step 1: Run the whole test suite**

Run: `npm test`
Expected: PASS — all suites green (new + existing).

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. (Watch especially for the new `CoverLetterContent`/`normalizeKeyword` imports in `prompts.ts`.)

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no new errors.

- [ ] **Step 4: Commit (only if lint/type fixes were needed)**

```bash
git add -A
git commit -m "chore: lint/type fixes for cover-letter coverage work"
```

---

## Self-Review

**1. Spec coverage**
- "Improve cover letter quality / not just REST APIs" → Task 2 system prompt: 2–3 body paragraphs, ~300–350 words, explicit "cover SEVERAL distinct strengths… do NOT build the whole letter around one technology."
- "Include more keyword matches" → Task 2 `keywordsToWeave` target list + Task 3 auto-retry that re-feeds missing keywords + Task 1 generous matcher that counts genuinely-present concepts.
- Requester decisions (retry yes, generous matcher, ~300–350 words) → all implemented.

**2. Placeholder scan** — none; every code/test step contains complete content and exact commands with expected output.

**3. Type consistency** — `coverLetterUser` signature in Task 2 matches its call sites in Task 3 (`priorContent`, `mustCover`). `assembleLetter(content, jobAnalysis)` is defined and used consistently in Task 3. `CoverLetterContent` is imported in both `prompts.ts` and `route.ts`. `coverLetterCoverage(job, letter)` signature unchanged (Task 1), so all callers stay valid.

**Coverage-math sanity (retry tests):** universe = React, TypeScript, Node.js, REST APIs, unit testing, communication, collaboration, Automation, Agile = 9. `lowDraft` covers React + REST APIs = 2/9 = 22% (< 70 → retry). `highDraft` covers all 9 = 100% (≥ 70 → no retry in that case). Note `Node.js` is matched because `tokenPattern` keeps the internal dot and treats the trailing `s` as optional.
