# JobFit Resume — AI-Powered ATS Resume Tailor — Design

**Date:** 2026-06-03
**Status:** Approved (Sections 1 & 2 user-approved; 3 & 4 designer's choice per user direction "choose the best option")

## Goal

A single-page web app where the user pastes a job description, sees extracted job requirements, reviews matched vs. missing ("gap") keywords, clicks **Accept All Gaps** to bulk-accept missing keywords, and generates an ATS-friendly tailored resume rendered from a fixed template (matching the user's real resume PDF) that can be exported to PDF (print) and copied as plain text.

## Architecture

```
Browser (Next.js UI — JobFit stitch design system)
   → POST /api/analyze-job       (Next.js Route Handler)
   → POST /api/generate-resume   (Next.js Route Handler)
        → fetch https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/ai/run/{model}
          Authorization: Bearer {CLOUDFLARE_API_TOKEN}
          body: { messages:[...], response_format:{ type:"json_schema", json_schema:{...} } }
        → result.response  → Zod validate → JSON to browser
```

The AI backend is **Cloudflare Workers AI via REST** — the exact pattern proven in the user's `story-crafter` project (`api/generate.js`): a direct `fetch` to `api.cloudflare.com/.../ai/run/{model}`. **No separate Cloudflare Worker, no Wrangler, no `wrangler.toml`, no AI binding, no second deployment.** Cloudflare-only (no OpenRouter fallback).

Hosting: Vercel (Next.js). AI processing: Cloudflare. The Next.js Route Handlers are the only thing that talks to Cloudflare; the browser never sees Cloudflare credentials.

### Confirmed from live Cloudflare docs (2026-06-03)
- Endpoint: `https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/ai/run/{model}`
- Auth header: `Authorization: Bearer {API_TOKEN}` — token needs `Workers AI - Read` + `Workers AI - Edit`
- Request body: `{ "messages": [{role, content}, ...] }`; optional `max_tokens`
- **JSON Mode**: add `response_format: { type: "json_schema", json_schema: <schema> }` to force valid structured JSON (compatible with OpenAI's implementation). This is the key reliability win over story-crafter's free-text parsing.
- Response shape: generated text at `result.response`. Envelope: `{ result: {...}, success, errors, messages }`. With JSON Mode the structured object is returned in the result (parse defensively: accept `result.response` whether string-to-parse or already-object).
- Model: `@cf/meta/llama-3.1-8b-instruct` default, overridable via `CLOUDFLARE_MODEL`.

Docs: https://developers.cloudflare.com/workers-ai/get-started/rest-api/ , https://developers.cloudflare.com/workers-ai/features/json-mode/

## Tech Stack

- Next.js 16.2.7 (App Router) + React 19.2.4 + TypeScript (strict)
- Tailwind CSS **v4** (CSS-first config via `@theme` in `app/globals.css` — there is NO `tailwind.config.js`)
- shadcn/ui-style components (hand-rolled primitives styled to the stitch design; avoid a CLI that assumes Tailwind v3 config)
- Zod for validation
- React Hook Form for the job-description form
- Vitest + Testing Library for tests
- **No** Vercel AI SDK, **no** Groq, **no** auth, **no** database

> ⚠️ Per `AGENTS.md`: this Next.js version has breaking changes vs. training data. Implementers MUST read `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md` before writing route handlers.

## Division of Labor (AI vs. Algorithm)

**AI (Cloudflare) handles:** understanding job-description language, extracting structured job requirements, rewriting the summary and bullets, suggesting professional phrasing. Output is always structured JSON; the AI never controls layout.

**TypeScript algorithm handles:** keyword normalization, matching, gap detection, match score, dedup, skill categorization, section ordering, template rendering, validation rules, export. Deterministic and unit-tested.

## Data Model

```ts
// types/job.ts
type JobAnalysis = {
  jobTitle: string;
  companyName?: string;
  technologies: string[];
  hardSkills: string[];
  softSkills: string[];
  responsibilities: string[];
  preferredQualifications: string[];
  atsKeywords: string[];
};

// types/profile.ts
type Profile = {
  name: string;
  title: string;
  contact: { email: string; phone?: string; location: string; github?: string; portfolio?: string; linkedin?: string };
  summary: string;
  skills: string[];          // core competencies
  experience: { company: string; location?: string; role: string; dates: string; bullets: string[] }[];
  projects: { name: string; technologies: string[]; bullets: string[] }[];
  education: { school: string; location?: string; degree: string; dates?: string; gpa?: string; honors?: string[] }[];
};

// types/resume.ts
type GapAnalysis = {
  matchedKeywords: string[];
  gapKeywords: string[];
  similarKeywords: { jobKeyword: string; profileKeyword: string }[];
  matchScore: number;        // current (verified only)
  potentialScore: number;    // if all gaps accepted
};

type ResumeSession = {
  jobAnalysis: JobAnalysis;
  matchedKeywords: string[];
  gapKeywords: string[];
  gapMode: "accept_all" | "verified_only" | "custom";
  acceptedKeywords: string[];
};

type GeneratedResume = Profile;  // same shape; AI rewrites summary/bullets/skills only
```

## Matching Algorithm (Section 2 — approved)

- **normalizeKeyword**: lowercase, trim, collapse whitespace, strip punctuation, apply alias map (`reactjs/react.js→react`, `nodejs→node.js`, `postgres→postgresql`, `js→javascript`, `ts→typescript`, `rest/restful api→rest apis`, `ci/cd→cicd`, …). Alias map is an extendable plain object.
- **compareKeywords**: build normalized profile-keyword set; per job keyword classify matched vs. gap; return original display casing. `similarKeywords` = minimal token-overlap near-misses (info only, not auto-matched). YAGNI: no fuzzy edit distance.
- **calculateMatchScore**: weights — technologies 40%, hardSkills 30%, responsibilities 20%, softSkills 10%. Per category = (matched ÷ total) × weight; sum, round to 0–100. Compute `current` (verified profile) and `potential` (profile + all gaps).
- **Accept All Gaps**: `gapMode="accept_all"` → `acceptedKeywords=[...gapKeywords]`. `verified_only` → `[]`. `custom` → user toggles chips. Live score recalculates `(matched + accepted)` vs. job totals.
- **Safe placement (§7)**: accepted gaps are flagged `skillsOnly`; the generate prompt may place them only in Technical Skills / Summary phrasing — never as fabricated experience achievements. Validation double-checks.

## ATS Template & Resume Rendering (Section 3)

`data/leonardo-profile.ts` seeds the master profile from the user's real resume PDF (`Leonardo_Lopez_Resume.pdf`):
- Leonardo Lopez · New York, NY · (347) 659-1803 · leonardojeziellopez@gmail.com · linkedin.com/in/leonardo-jeziel-lopez · portfolio-leonardo-lopez.vercel.app
- Summary: "Dynamic Web Developer skilled in Python and JavaScript with extensive background in records and information services…"
- Experience: Web Developer — NYC Department of Records and Information Services, New York, NY (Nov 2022 – May 2026), 6 bullets (Squarespace→full-stack migration cutting cost ~$2,500→$5; PayPal integration; RESTful APIs; volunteer platform with Python/Flask/SQLAlchemy/PostgreSQL; database schema/optimization; debugging/testing/Git/Agile/code reviews)
- Core competencies: Python, JavaScript, TypeScript, Java, SQL, HTML, CSS, Git, GitHub, React, Node.js, Flask, REST APIs, Generative AI, Prompt Engineering, RAG, Computer Vision, Automation, Full-Stack Development, Software Development, API Integration, System Design, Debugging, Testing, Performance Optimization, Cloud Technologies, Agile Methodologies, Version Control, Data Structures & Algorithms, Information Retrieval, Workflow Automation, Problem Solving, NoSQL, PostgreSQL, Project Management
- Education: NYCCT/CUNY — B.Tech Computer Systems Technology (May 2026, GPA 3.254, Dean's List); A.A.S. Computer Information Systems (Feb 2025, GPA 3.012, Dean's List)

`lib/resume/renderResumeTemplate.tsx` — single React component reproducing the PDF: centered uppercase name, contact line joined by ` | `, sections in order **PROFESSIONAL SUMMARY → TECHNICAL SKILLS → PROFESSIONAL EXPERIENCE → PROJECTS → EDUCATION**, bold uppercase headings, `•` bullets, right-aligned dates, selectable black-on-white text, one column, no tables/icons/graphics (§17). Same component is on-screen preview and print target.

**Validation** (`lib/resume/validateResume.ts` + Zod) drives the right-rail "Resume Checks": valid JSON (JSON Mode), all required sections present, no duplicate skills (post-dedup), bullets ≤ ~220 chars, no banned phrases (blocklist: "team player", "hard worker", "results-driven", "go-getter", "synergy", "think outside the box", …), and **no-fabrication guard** — companies/degrees/dates/schools must equal the master profile verbatim (AI may only rewrite summary/bullets/skills). Accepted-gap keyword appearing as a concrete experience achievement → flagged.

**Export**: `Copy Text` (plain-text resume to clipboard) and `Download PDF` via `window.print()` + a `@media print` stylesheet isolating the resume node. Zero deps, real selectable ATS text. DOCX deferred.

## UI Components (Section 4)

Single page `/`. Design from `stitch/precision_ats_intelligence/DESIGN.md`: Inter font, Indigo 600 primary, Slate neutrals, Gray-50 canvas, white `rounded-xl` cards with 1px slate borders, soft shadows, functional colors (Amber = gaps, Emerald = optimized/matched, Rose = errors). The 9 stitch screens are the reference for each state.

Components: `Header`, `JobDescriptionInput`, `AnalyzeButton`, `JobAnalysisPanel`, `MatchScoreCard` (current→potential rings, "72% → 94%"), `KeywordSection` (matched/gap chips), `GapReviewPanel` (Accept All Gaps / Use Only Verified Profile / Customize List + per-chip toggles in custom mode), `ResumePreview` (the ATS template), `ResumeChecks` (right rail), `ExportButtons`, `LoadingState` (processing steps per `loading_states` screen), `ErrorState` (per `error_state` screen).

State lives in a single `page.tsx` client component (or a small `useResumeSession` hook). No global store needed for MVP.

## File Structure

```
app/
  layout.tsx                  # Inter font, metadata, design tokens
  page.tsx                    # single-page orchestration + session state
  globals.css                 # Tailwind v4 @theme tokens + print styles
  api/
    analyze-job/route.ts
    generate-resume/route.ts
components/
  Header.tsx
  JobDescriptionInput.tsx
  AnalyzeButton.tsx
  JobAnalysisPanel.tsx
  MatchScoreCard.tsx
  KeywordSection.tsx
  GapReviewPanel.tsx
  ResumePreview.tsx
  ResumeChecks.tsx
  ExportButtons.tsx
  LoadingState.tsx
  ErrorState.tsx
  ui/                         # button, card, textarea, badge, progress
data/
  leonardo-profile.ts
lib/
  cloudflare/callWorkersAI.ts # REST fetch + JSON-mode helper
  matching/
    normalizeKeyword.ts
    compareKeywords.ts
    calculateMatchScore.ts
    categorizeSkills.ts
  resume/
    buildResumePayload.ts
    renderResumeTemplate.tsx
    validateResume.ts
  utils/
    removeDuplicates.ts
    cleanText.ts
schemas/
  job-analysis.schema.ts
  resume.schema.ts
  profile.schema.ts
types/
  job.ts  profile.ts  resume.ts
```

## Environment Variables (Vercel)

```
CLOUDFLARE_API_TOKEN=<token with Workers AI Read+Edit>
CLOUDFLARE_ACCOUNT_ID=<account id>
CLOUDFLARE_MODEL=@cf/meta/llama-3.1-8b-instruct   # optional override
```
No client-exposed secrets (no `NEXT_PUBLIC_` for these). `.env.local` for dev; `.env.example` committed.

## Error Handling

- Route handlers: 405 on wrong method, 400 on missing/empty job description, 500 with a clean message on Cloudflare failure. 4-minute `AbortController` upstream timeout (as in story-crafter). `route.ts` sets `maxDuration` via segment config (300s) for Vercel.
- AI returns malformed JSON → caught, surfaced as a typed error → `ErrorState` with retry.
- Cloudflare not configured (missing env) → explicit "AI not configured" message.

## Build Order (MVP scope)

1. App shell + design tokens + UI primitives (Inter, Indigo/Slate, print CSS)
2. Master profile + ATS template + preview (real data, no AI)
3. Matching algorithm (normalize/compare/score) — TDD
4. Mock-data UI flow: input → analysis → gaps → Accept All → score
5. Cloudflare REST helper + `/api/analyze-job` (JSON Mode + Zod)
6. Wire analyze end-to-end (replace mock)
7. `/api/generate-resume` + validation + Resume Checks
8. Export (print-to-PDF + copy text)
9. Polish loading/error states; `.env.example`; README

Out of scope (MVP): login, database, saved users, payments, dashboard, cover letters, DOCX, job scraping, OpenRouter.
