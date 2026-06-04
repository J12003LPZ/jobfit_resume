# JobFit Resume Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-page Next.js app that takes a pasted job description, extracts requirements via Cloudflare Workers AI (REST), shows matched vs. gap keywords with a one-click "Accept All Gaps", and generates an ATS resume (matching Leonardo's real PDF) exportable to PDF and plain text.

**Architecture:** Next.js 16 App Router on Vercel. Two Route Handlers (`/api/analyze-job`, `/api/generate-resume`) call the Cloudflare REST endpoint `api.cloudflare.com/.../ai/run/{model}` with JSON Mode. Deterministic TypeScript handles keyword matching, scoring, validation, and template rendering. No separate Cloudflare Worker, no DB, no auth.

**Tech Stack:** Next.js 16.2.7, React 19, TypeScript (strict), Tailwind v4 (CSS-first), Zod, React Hook Form, Vitest + Testing Library. Cloudflare Workers AI via REST.

> ⚠️ **Per AGENTS.md, this Next.js has breaking changes.** Before writing any Route Handler, read `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`. Before writing `layout.tsx`/metadata, read `node_modules/next/dist/docs/01-app/01-getting-started/14-metadata-and-og-images.md`. Tailwind is **v4** — config lives in `app/globals.css` via `@theme`; there is NO `tailwind.config.js`.

---

## Task 0: Project setup — test runner & dependencies

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`

- [ ] **Step 1: Install dependencies**

Run:
```bash
npm install zod react-hook-form @hookform/resolvers
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```
Expected: installs succeed, `package.json` updated.

- [ ] **Step 2: Create Vitest config**

Create `vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    alias: { "@": resolve(__dirname, ".") },
  },
});
```

- [ ] **Step 3: Create Vitest setup**

Create `vitest.setup.ts`:
```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 4: Add test scripts to package.json**

In `package.json` `"scripts"`, add:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Verify the runner works**

Create a throwaway `lib/__smoke__.test.ts`:
```ts
import { describe, it, expect } from "vitest";
describe("smoke", () => { it("runs", () => { expect(1 + 1).toBe(2); }); });
```
Run: `npm run test`
Expected: 1 passed. Then delete `lib/__smoke__.test.ts`.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.ts vitest.setup.ts
git commit -m "chore: add vitest, zod, react-hook-form"
```

---

## Task 1: Type definitions

**Files:**
- Create: `types/job.ts`
- Create: `types/profile.ts`
- Create: `types/resume.ts`

No tests (pure types). These are imported by later tasks.

- [ ] **Step 1: Create `types/job.ts`**

```ts
export type JobAnalysis = {
  jobTitle: string;
  companyName?: string;
  technologies: string[];
  hardSkills: string[];
  softSkills: string[];
  responsibilities: string[];
  preferredQualifications: string[];
  atsKeywords: string[];
};
```

- [ ] **Step 2: Create `types/profile.ts`**

```ts
export type ContactInfo = {
  email: string;
  phone?: string;
  location: string;
  github?: string;
  portfolio?: string;
  linkedin?: string;
};

export type ExperienceEntry = {
  company: string;
  location?: string;
  role: string;
  dates: string;
  bullets: string[];
};

export type ProjectEntry = {
  name: string;
  technologies: string[];
  bullets: string[];
};

export type EducationEntry = {
  school: string;
  location?: string;
  degree: string;
  dates?: string;
  gpa?: string;
  honors?: string[];
};

export type Profile = {
  name: string;
  title: string;
  contact: ContactInfo;
  summary: string;
  skills: string[];
  experience: ExperienceEntry[];
  projects: ProjectEntry[];
  education: EducationEntry[];
};
```

- [ ] **Step 3: Create `types/resume.ts`**

```ts
import type { JobAnalysis } from "./job";
import type { Profile } from "./profile";

export type GapAnalysis = {
  matchedKeywords: string[];
  gapKeywords: string[];
  similarKeywords: { jobKeyword: string; profileKeyword: string }[];
  matchScore: number;       // current (verified profile only)
  potentialScore: number;   // if all gaps accepted
};

export type GapMode = "accept_all" | "verified_only" | "custom";

export type ResumeSession = {
  jobAnalysis: JobAnalysis;
  matchedKeywords: string[];
  gapKeywords: string[];
  gapMode: GapMode;
  acceptedKeywords: string[];
};

export type GeneratedResume = Profile;
```

- [ ] **Step 4: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add types/
git commit -m "feat: add core type definitions"
```

---

## Task 2: Zod schemas

**Files:**
- Create: `schemas/job-analysis.schema.ts`
- Create: `schemas/profile.schema.ts`
- Create: `schemas/resume.schema.ts`
- Test: `schemas/job-analysis.schema.test.ts`

- [ ] **Step 1: Write the failing test**

Create `schemas/job-analysis.schema.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { jobAnalysisSchema } from "./job-analysis.schema";

describe("jobAnalysisSchema", () => {
  it("accepts a valid analysis", () => {
    const valid = {
      jobTitle: "Frontend Developer",
      technologies: ["React", "TypeScript"],
      hardSkills: ["debugging"],
      softSkills: ["communication"],
      responsibilities: ["Build UIs"],
      preferredQualifications: [],
      atsKeywords: ["React", "Agile"],
    };
    expect(jobAnalysisSchema.parse(valid).jobTitle).toBe("Frontend Developer");
  });

  it("defaults missing arrays to empty and rejects missing jobTitle", () => {
    const partial = { jobTitle: "Dev" };
    const parsed = jobAnalysisSchema.parse(partial);
    expect(parsed.technologies).toEqual([]);
    expect(() => jobAnalysisSchema.parse({})).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run schemas/job-analysis.schema.test.ts`
Expected: FAIL — cannot import `jobAnalysisSchema`.

- [ ] **Step 3: Create the schemas**

Create `schemas/job-analysis.schema.ts`:
```ts
import { z } from "zod";

const strArray = z.array(z.string()).default([]);

export const jobAnalysisSchema = z.object({
  jobTitle: z.string().min(1),
  companyName: z.string().optional(),
  technologies: strArray,
  hardSkills: strArray,
  softSkills: strArray,
  responsibilities: strArray,
  preferredQualifications: strArray,
  atsKeywords: strArray,
});

export type JobAnalysisInput = z.infer<typeof jobAnalysisSchema>;
```

Create `schemas/profile.schema.ts`:
```ts
import { z } from "zod";

export const contactSchema = z.object({
  email: z.string(),
  phone: z.string().optional(),
  location: z.string(),
  github: z.string().optional(),
  portfolio: z.string().optional(),
  linkedin: z.string().optional(),
});

export const experienceSchema = z.object({
  company: z.string(),
  location: z.string().optional(),
  role: z.string(),
  dates: z.string(),
  bullets: z.array(z.string()),
});

export const projectSchema = z.object({
  name: z.string(),
  technologies: z.array(z.string()),
  bullets: z.array(z.string()),
});

export const educationSchema = z.object({
  school: z.string(),
  location: z.string().optional(),
  degree: z.string(),
  dates: z.string().optional(),
  gpa: z.string().optional(),
  honors: z.array(z.string()).optional(),
});

export const profileSchema = z.object({
  name: z.string(),
  title: z.string(),
  contact: contactSchema,
  summary: z.string(),
  skills: z.array(z.string()),
  experience: z.array(experienceSchema),
  projects: z.array(projectSchema),
  education: z.array(educationSchema),
});
```

Create `schemas/resume.schema.ts`:
```ts
import { profileSchema } from "./profile.schema";

// Generated resume has the same shape as a profile.
export const generatedResumeSchema = profileSchema;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run schemas/job-analysis.schema.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add schemas/
git commit -m "feat: add zod schemas for job analysis, profile, resume"
```

---

## Task 3: Keyword normalization

**Files:**
- Create: `lib/matching/normalizeKeyword.ts`
- Test: `lib/matching/normalizeKeyword.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/matching/normalizeKeyword.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { normalizeKeyword } from "./normalizeKeyword";

describe("normalizeKeyword", () => {
  it("lowercases, trims, collapses whitespace", () => {
    expect(normalizeKeyword("  React   Native ")).toBe("react native");
  });
  it("strips surrounding punctuation", () => {
    expect(normalizeKeyword("Node.js,")).toBe("node.js");
  });
  it("applies aliases", () => {
    expect(normalizeKeyword("ReactJS")).toBe("react");
    expect(normalizeKeyword("React.js")).toBe("react");
    expect(normalizeKeyword("nodejs")).toBe("node.js");
    expect(normalizeKeyword("Postgres")).toBe("postgresql");
    expect(normalizeKeyword("JS")).toBe("javascript");
    expect(normalizeKeyword("TS")).toBe("typescript");
    expect(normalizeKeyword("RESTful API")).toBe("rest apis");
    expect(normalizeKeyword("CI/CD")).toBe("cicd");
  });
  it("returns empty string for empty input", () => {
    expect(normalizeKeyword("   ")).toBe("");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/matching/normalizeKeyword.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `lib/matching/normalizeKeyword.ts`:
```ts
const ALIASES: Record<string, string> = {
  "reactjs": "react",
  "react.js": "react",
  "react js": "react",
  "nodejs": "node.js",
  "node js": "node.js",
  "node": "node.js",
  "postgres": "postgresql",
  "js": "javascript",
  "ts": "typescript",
  "rest": "rest apis",
  "rest api": "rest apis",
  "restful": "rest apis",
  "restful api": "rest apis",
  "restful apis": "rest apis",
  "ci/cd": "cicd",
  "ci cd": "cicd",
};

export function normalizeKeyword(input: string): string {
  let s = input.toLowerCase().trim().replace(/\s+/g, " ");
  // strip leading/trailing punctuation but keep internal dots/slashes
  s = s.replace(/^[^a-z0-9]+/, "").replace(/[^a-z0-9.+#]+$/, "");
  if (ALIASES[s]) return ALIASES[s];
  return s;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/matching/normalizeKeyword.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/matching/normalizeKeyword.ts lib/matching/normalizeKeyword.test.ts
git commit -m "feat: add keyword normalization with alias map"
```

---

## Task 4: Remove duplicates utility

**Files:**
- Create: `lib/utils/removeDuplicates.ts`
- Test: `lib/utils/removeDuplicates.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/utils/removeDuplicates.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { removeDuplicates } from "./removeDuplicates";

describe("removeDuplicates", () => {
  it("removes case/alias duplicates, keeps first display form", () => {
    expect(removeDuplicates(["React", "reactjs", "TypeScript", "ts"])).toEqual([
      "React",
      "TypeScript",
    ]);
  });
  it("drops empty entries", () => {
    expect(removeDuplicates(["React", "  ", ""])).toEqual(["React"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/utils/removeDuplicates.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `lib/utils/removeDuplicates.ts`:
```ts
import { normalizeKeyword } from "@/lib/matching/normalizeKeyword";

export function removeDuplicates(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const norm = normalizeKeyword(item);
    if (!norm) continue;
    if (seen.has(norm)) continue;
    seen.add(norm);
    out.push(item.trim());
  }
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/utils/removeDuplicates.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/utils/removeDuplicates.ts lib/utils/removeDuplicates.test.ts
git commit -m "feat: add removeDuplicates utility"
```

---

## Task 5: Compare keywords (matched vs. gap)

**Files:**
- Create: `lib/matching/compareKeywords.ts`
- Test: `lib/matching/compareKeywords.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/matching/compareKeywords.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { compareKeywords } from "./compareKeywords";

describe("compareKeywords", () => {
  it("splits job keywords into matched and gap using profile set", () => {
    const job = ["React", "AWS", "TypeScript", "Docker"];
    const profile = ["typescript", "sql", "debugging"];
    const result = compareKeywords(job, profile);
    expect(result.matched).toEqual(["TypeScript"]);
    expect(result.gap).toEqual(["React", "AWS", "Docker"]);
  });

  it("matches across aliases (React.js vs React)", () => {
    const result = compareKeywords(["React.js"], ["react"]);
    expect(result.matched).toEqual(["React.js"]);
    expect(result.gap).toEqual([]);
  });

  it("preserves original display casing of job keywords", () => {
    const result = compareKeywords(["JavaScript"], ["javascript"]);
    expect(result.matched).toEqual(["JavaScript"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/matching/compareKeywords.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `lib/matching/compareKeywords.ts`:
```ts
import { normalizeKeyword } from "./normalizeKeyword";

export type CompareResult = {
  matched: string[];
  gap: string[];
};

export function compareKeywords(
  jobKeywords: string[],
  profileKeywords: string[]
): CompareResult {
  const profileSet = new Set(
    profileKeywords.map(normalizeKeyword).filter(Boolean)
  );
  const matched: string[] = [];
  const gap: string[] = [];
  const seen = new Set<string>();

  for (const kw of jobKeywords) {
    const norm = normalizeKeyword(kw);
    if (!norm || seen.has(norm)) continue;
    seen.add(norm);
    if (profileSet.has(norm)) matched.push(kw.trim());
    else gap.push(kw.trim());
  }
  return { matched, gap };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/matching/compareKeywords.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/matching/compareKeywords.ts lib/matching/compareKeywords.test.ts
git commit -m "feat: add keyword comparison (matched vs gap)"
```

---

## Task 6: Calculate match score

**Files:**
- Create: `lib/matching/calculateMatchScore.ts`
- Test: `lib/matching/calculateMatchScore.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/matching/calculateMatchScore.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { calculateMatchScore } from "./calculateMatchScore";
import type { JobAnalysis } from "@/types/job";

const job: JobAnalysis = {
  jobTitle: "Dev",
  technologies: ["React", "TypeScript"], // 40% weight
  hardSkills: ["debugging", "testing"],  // 30%
  softSkills: ["communication"],         // 10%
  responsibilities: ["build apis"],      // 20%
  preferredQualifications: [],
  atsKeywords: [],
};

describe("calculateMatchScore", () => {
  it("returns 100 when profile covers everything", () => {
    const profile = ["react", "typescript", "debugging", "testing", "communication", "build apis"];
    expect(calculateMatchScore(job, profile)).toBe(100);
  });

  it("returns 0 when nothing matches", () => {
    expect(calculateMatchScore(job, ["python"])).toBe(0);
  });

  it("weights categories: tech-only match (2/2) = 40", () => {
    expect(calculateMatchScore(job, ["react", "typescript"])).toBe(40);
  });

  it("ignores empty categories without dividing by zero", () => {
    const techOnly: JobAnalysis = { ...job, hardSkills: [], softSkills: [], responsibilities: [] };
    expect(calculateMatchScore(techOnly, ["react", "typescript"])).toBe(100);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/matching/calculateMatchScore.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `lib/matching/calculateMatchScore.ts`:
```ts
import type { JobAnalysis } from "@/types/job";
import { normalizeKeyword } from "./normalizeKeyword";

const WEIGHTS = {
  technologies: 40,
  hardSkills: 30,
  responsibilities: 20,
  softSkills: 10,
} as const;

function categoryRatio(items: string[], profileSet: Set<string>): number | null {
  const normed = items.map(normalizeKeyword).filter(Boolean);
  if (normed.length === 0) return null; // empty category contributes nothing
  const matched = normed.filter((k) => profileSet.has(k)).length;
  return matched / normed.length;
}

export function calculateMatchScore(
  job: JobAnalysis,
  profileKeywords: string[]
): number {
  const profileSet = new Set(profileKeywords.map(normalizeKeyword).filter(Boolean));

  let weightedSum = 0;
  let totalWeight = 0;
  for (const [cat, weight] of Object.entries(WEIGHTS) as [keyof typeof WEIGHTS, number][]) {
    const ratio = categoryRatio(job[cat], profileSet);
    if (ratio === null) continue;
    weightedSum += ratio * weight;
    totalWeight += weight;
  }
  if (totalWeight === 0) return 0;
  // Re-base to 0-100 across only the present categories.
  return Math.round((weightedSum / totalWeight) * 100);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/matching/calculateMatchScore.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/matching/calculateMatchScore.ts lib/matching/calculateMatchScore.test.ts
git commit -m "feat: add weighted match score calculation"
```

---

## Task 7: Gap analysis aggregator

**Files:**
- Create: `lib/matching/analyzeGaps.ts`
- Test: `lib/matching/analyzeGaps.test.ts`

This combines compare + score into the `GapAnalysis` the UI consumes, computing both current and potential scores.

- [ ] **Step 1: Write the failing test**

Create `lib/matching/analyzeGaps.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { analyzeGaps } from "./analyzeGaps";
import type { JobAnalysis } from "@/types/job";

const job: JobAnalysis = {
  jobTitle: "Frontend Developer",
  technologies: ["React", "TypeScript", "AWS", "Docker"],
  hardSkills: ["debugging"],
  softSkills: ["communication"],
  responsibilities: ["build interfaces"],
  preferredQualifications: [],
  atsKeywords: [],
};

describe("analyzeGaps", () => {
  it("computes matched, gap, and both scores", () => {
    const profileKeywords = ["typescript", "debugging", "communication", "build interfaces"];
    const result = analyzeGaps(job, profileKeywords);
    expect(result.matchedKeywords).toContain("TypeScript");
    expect(result.gapKeywords).toEqual(expect.arrayContaining(["React", "AWS", "Docker"]));
    expect(result.potentialScore).toBe(100);
    expect(result.matchScore).toBeLessThan(result.potentialScore);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/matching/analyzeGaps.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `lib/matching/analyzeGaps.ts`:
```ts
import type { JobAnalysis } from "@/types/job";
import type { GapAnalysis } from "@/types/resume";
import { compareKeywords } from "./compareKeywords";
import { calculateMatchScore } from "./calculateMatchScore";

// Flatten every job keyword across categories for the matched/gap chip lists.
function allJobKeywords(job: JobAnalysis): string[] {
  return [
    ...job.technologies,
    ...job.hardSkills,
    ...job.softSkills,
    ...job.responsibilities,
    ...job.atsKeywords,
  ];
}

export function analyzeGaps(
  job: JobAnalysis,
  profileKeywords: string[]
): GapAnalysis {
  const { matched, gap } = compareKeywords(allJobKeywords(job), profileKeywords);

  const matchScore = calculateMatchScore(job, profileKeywords);
  // Potential: pretend the profile also has every gap keyword.
  const potentialScore = calculateMatchScore(job, [...profileKeywords, ...gap]);

  return {
    matchedKeywords: matched,
    gapKeywords: gap,
    similarKeywords: [],
    matchScore,
    potentialScore,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/matching/analyzeGaps.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add lib/matching/analyzeGaps.ts lib/matching/analyzeGaps.test.ts
git commit -m "feat: add gap analysis aggregator with current/potential scores"
```

---

## Task 8: Master profile data

**Files:**
- Create: `data/leonardo-profile.ts`
- Test: `data/leonardo-profile.test.ts`

Data transcribed from `Leonardo_Lopez_Resume.pdf`.

- [ ] **Step 1: Write the failing test**

Create `data/leonardo-profile.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { leonardoProfile } from "./leonardo-profile";
import { profileSchema } from "@/schemas/profile.schema";

describe("leonardoProfile", () => {
  it("conforms to the profile schema", () => {
    expect(() => profileSchema.parse(leonardoProfile)).not.toThrow();
  });
  it("has the expected identity and one experience entry", () => {
    expect(leonardoProfile.name).toBe("Leonardo Lopez");
    expect(leonardoProfile.experience).toHaveLength(1);
    expect(leonardoProfile.experience[0].company).toContain("Records");
    expect(leonardoProfile.education.length).toBeGreaterThanOrEqual(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run data/leonardo-profile.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `data/leonardo-profile.ts`:
```ts
import type { Profile } from "@/types/profile";

export const leonardoProfile: Profile = {
  name: "Leonardo Lopez",
  title: "Web Developer",
  contact: {
    email: "leonardojeziellopez@gmail.com",
    phone: "(347) 659-1803",
    location: "New York, NY",
    linkedin: "linkedin.com/in/leonardo-jeziel-lopez",
    portfolio: "https://portfolio-leonardo-lopez.vercel.app/",
  },
  summary:
    "Dynamic Web Developer skilled in Python and JavaScript with extensive background in records and information services. Proven track record in creating secure, user-friendly applications and optimizing performance. Adept at complex problem solving and delivering innovative solutions that enhance user experience and meet client needs. Communicate and collaborate effectively on multidisciplinary teams.",
  skills: [
    "Python", "JavaScript", "TypeScript", "Java", "SQL", "HTML", "CSS", "Git",
    "GitHub", "React", "Node.js", "Flask", "REST APIs", "Responsive Design",
    "Web Development", "Database Management", "AI/LLM Integration",
    "Generative AI", "Prompt Engineering", "RAG", "Computer Vision",
    "Automation", "Full-Stack Development", "Software Development",
    "API Integration", "System Design", "Debugging", "Testing",
    "Performance Optimization", "Cloud Technologies", "Agile Methodologies",
    "Version Control", "Data Structures & Algorithms", "Information Retrieval",
    "Workflow Automation", "Problem Solving", "NoSQL", "PostgreSQL",
    "Project Management",
  ],
  experience: [
    {
      company: "NYC Department of Records and Information Services",
      location: "New York, NY",
      role: "Web Developer",
      dates: "Nov 2022 – May 2026",
      bullets: [
        "Migrated the New York Archival Society website from Squarespace to a custom full-stack web application using Python, JavaScript, and SQL, reducing annual platform costs from approximately $2,500 to $5.",
        "Designed and developed scalable backend features, including PayPal payment integration, improving maintainability, transaction handling, and future feature expansion.",
        "Built and integrated RESTful APIs to support dynamic application functionality, streamline data flow, and connect frontend, backend, and database layers.",
        "Developed a volunteer management platform using Python, Flask, SQLAlchemy, and PostgreSQL to manage recruitment, scheduling, tracking, and administrative workflows.",
        "Designed and maintained database systems, including schema design, SQL query optimization, data validation, backups, and performance tuning to improve accuracy and efficiency.",
        "Improved application reliability through debugging, testing, Git version control, Agile collaboration, and code reviews.",
      ],
    },
  ],
  projects: [],
  education: [
    {
      school: "New York City College of Technology, CUNY",
      location: "Brooklyn, NY",
      degree: "Bachelor of Technology, Computer Systems Technology",
      dates: "May 2026",
      gpa: "3.254",
      honors: ["Dean's List | 01/06/2026", "Dean's List | 06/15/2024"],
    },
    {
      school: "New York City College of Technology, CUNY",
      location: "Brooklyn, NY",
      degree: "Associate in Applied Science, Computer Information Systems",
      dates: "Feb 2025",
      gpa: "3.012",
      honors: ["Dean's List | 01/13/2023"],
    },
  ],
};

/** Flat list of every keyword the profile can satisfy (for gap matching). */
export function profileKeywords(): string[] {
  const fromSkills = leonardoProfile.skills;
  const fromProjects = leonardoProfile.projects.flatMap((p) => p.technologies);
  return [...fromSkills, ...fromProjects];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run data/leonardo-profile.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add data/leonardo-profile.ts data/leonardo-profile.test.ts
git commit -m "feat: add Leonardo master profile from resume PDF"
```

---

## Task 9: Design tokens, fonts, and print CSS

**Files:**
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`

> Read `node_modules/next/dist/docs/01-app/01-getting-started/14-metadata-and-og-images.md` first for the metadata API.

- [ ] **Step 1: Replace `app/globals.css` with the JobFit token set + print rules**

Replace the entire contents of `app/globals.css`:
```css
@import "tailwindcss";

@theme {
  --color-surface: #faf8ff;
  --color-canvas: #f9fafb;
  --color-card: #ffffff;
  --color-on-surface: #131b2e;
  --color-on-surface-variant: #434655;
  --color-primary: #2563eb;        /* Indigo 600 */
  --color-primary-strong: #004ac6;
  --color-on-primary: #ffffff;
  --color-outline: #e2e8f0;        /* Slate 200 */
  --color-amber: #b45309;          /* gaps */
  --color-amber-bg: #fffbeb;
  --color-emerald: #047857;        /* matched/optimized */
  --color-emerald-bg: #ecfdf5;
  --color-rose: #be123c;           /* errors */
  --color-rose-bg: #fff1f2;
  --font-sans: var(--font-inter), system-ui, sans-serif;
  --radius-card: 0.75rem;
  --radius-md: 0.5rem;
}

html, body {
  background: var(--color-canvas);
  color: var(--color-on-surface);
  font-family: var(--font-sans);
}

/* ---- Print: isolate the resume node for PDF export ---- */
@media print {
  body * { visibility: hidden; }
  #resume-print, #resume-print * { visibility: visible; }
  #resume-print {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    padding: 0.5in 0.6in;
    background: #ffffff;
    color: #000000;
  }
  @page { margin: 0; }
}
```

- [ ] **Step 2: Update `app/layout.tsx` to load Inter and set metadata**

Replace the contents of `app/layout.tsx`:
```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "JobFit Resume — AI-Powered ATS Resume Tailor",
  description:
    "Paste a job description, accept missing keywords in one click, and generate an ATS-friendly tailored resume.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Verify the app builds**

Run: `npm run build`
Expected: build succeeds (the default `page.tsx` still renders).

- [ ] **Step 4: Commit**

```bash
git add app/globals.css app/layout.tsx
git commit -m "feat: add JobFit design tokens, Inter font, print CSS"
```

---

## Task 10: UI primitives (Button, Card, Textarea, Badge, Progress)

**Files:**
- Create: `components/ui/Button.tsx`
- Create: `components/ui/Card.tsx`
- Create: `components/ui/Textarea.tsx`
- Create: `components/ui/Badge.tsx`
- Create: `components/ui/Progress.tsx`
- Create: `lib/utils/cn.ts`
- Test: `components/ui/Button.test.tsx`

> Reference the stitch screens for styling: `stitch/initial_empty_state/code.html` and `stitch/job_analyzed_state/code.html`.

- [ ] **Step 1: Create the `cn` class-merge helper**

Create `lib/utils/cn.ts`:
```ts
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
```

- [ ] **Step 2: Write the failing test for Button**

Create `components/ui/Button.test.tsx`:
```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "./Button";

describe("Button", () => {
  it("renders children and applies the variant class", () => {
    render(<Button variant="primary">Analyze Job</Button>);
    const btn = screen.getByRole("button", { name: "Analyze Job" });
    expect(btn).toBeInTheDocument();
  });
  it("is disabled when disabled prop set", () => {
    render(<Button disabled>Go</Button>);
    expect(screen.getByRole("button", { name: "Go" })).toBeDisabled();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run components/ui/Button.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 4: Create the primitives**

Create `components/ui/Button.tsx`:
```tsx
import { cn } from "@/lib/utils/cn";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:bg-[var(--color-primary-strong)]",
  secondary:
    "bg-transparent border border-[var(--color-outline)] text-[var(--color-on-surface)] hover:bg-[var(--color-surface)]",
  ghost: "bg-transparent text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface)]",
};

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
        VARIANTS[variant],
        className
      )}
      {...props}
    />
  );
}
```

Create `components/ui/Card.tsx`:
```tsx
import { cn } from "@/lib/utils/cn";
import type { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--color-outline)] bg-[var(--color-card)] p-6 shadow-sm",
        className
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-lg font-semibold", className)} {...props} />;
}
```

Create `components/ui/Textarea.tsx`:
```tsx
import { cn } from "@/lib/utils/cn";
import type { TextareaHTMLAttributes } from "react";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-md border border-[var(--color-outline)] bg-white p-3 text-sm",
        "focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30",
        className
      )}
      {...props}
    />
  );
}
```

Create `components/ui/Badge.tsx`:
```tsx
import { cn } from "@/lib/utils/cn";
import type { HTMLAttributes } from "react";

type Tone = "matched" | "gap" | "neutral";

const TONES: Record<Tone, string> = {
  matched: "bg-[var(--color-emerald-bg)] text-[var(--color-emerald)]",
  gap: "bg-[var(--color-amber-bg)] text-[var(--color-amber)]",
  neutral: "bg-[var(--color-surface)] text-[var(--color-on-surface-variant)]",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
        TONES[tone],
        className
      )}
      {...props}
    />
  );
}
```

Create `components/ui/Progress.tsx`:
```tsx
export function Progress({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="h-2 w-full rounded-full bg-[var(--color-surface)]">
      <div
        className="h-2 rounded-full bg-[var(--color-primary)] transition-all"
        style={{ width: `${clamped}%` }}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run components/ui/Button.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add components/ui lib/utils/cn.ts
git commit -m "feat: add UI primitives (Button, Card, Textarea, Badge, Progress)"
```

---

## Task 11: ATS resume template component

**Files:**
- Create: `lib/resume/renderResumeTemplate.tsx`
- Test: `lib/resume/renderResumeTemplate.test.tsx`

Reproduces the PDF layout. Wrapper has `id="resume-print"` so print CSS isolates it.

- [ ] **Step 1: Write the failing test**

Create `lib/resume/renderResumeTemplate.test.tsx`:
```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ResumeTemplate } from "./renderResumeTemplate";
import { leonardoProfile } from "@/data/leonardo-profile";

describe("ResumeTemplate", () => {
  it("renders name, all ATS section headings, and the print wrapper id", () => {
    const { container } = render(<ResumeTemplate resume={leonardoProfile} />);
    expect(screen.getByText("LEONARDO LOPEZ")).toBeInTheDocument();
    expect(screen.getByText("PROFESSIONAL SUMMARY")).toBeInTheDocument();
    expect(screen.getByText("TECHNICAL SKILLS")).toBeInTheDocument();
    expect(screen.getByText("PROFESSIONAL EXPERIENCE")).toBeInTheDocument();
    expect(screen.getByText("EDUCATION")).toBeInTheDocument();
    expect(container.querySelector("#resume-print")).not.toBeNull();
  });

  it("omits the Projects heading when there are no projects", () => {
    render(<ResumeTemplate resume={{ ...leonardoProfile, projects: [] }} />);
    expect(screen.queryByText("PROJECTS")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/resume/renderResumeTemplate.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `lib/resume/renderResumeTemplate.tsx`:
```tsx
import type { Profile } from "@/types/profile";

function Heading({ children }: { children: string }) {
  return (
    <h2 className="mt-4 border-b border-black/70 pb-0.5 text-[11pt] font-bold uppercase tracking-wide">
      {children}
    </h2>
  );
}

export function ResumeTemplate({ resume }: { resume: Profile }) {
  const c = resume.contact;
  const contactLine = [c.location, c.phone].filter(Boolean).join(" | ");
  const links = [c.email, c.linkedin, c.portfolio].filter(Boolean).join(" | ");

  return (
    <div
      id="resume-print"
      className="mx-auto max-w-[8.5in] bg-white p-8 font-serif text-[10.5pt] leading-snug text-black"
      style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
    >
      <h1 className="text-center text-[20pt] font-bold tracking-wide">
        {resume.name.toUpperCase()}
      </h1>
      <p className="text-center text-[10pt]">{contactLine}</p>
      {links && <p className="text-center text-[10pt] text-blue-800">{links}</p>}

      <Heading>Professional Summary</Heading>
      <p className="mt-1 text-justify">{resume.summary}</p>

      <Heading>Technical Skills</Heading>
      <p className="mt-1">{resume.skills.join(" • ")}</p>

      <Heading>Professional Experience</Heading>
      {resume.experience.map((e, i) => (
        <div key={i} className="mt-2">
          <div className="font-bold">{e.company}</div>
          {e.location && <div>{e.location}</div>}
          <div className="flex justify-between">
            <span className="italic">{e.role}</span>
            <span>{e.dates}</span>
          </div>
          <ul className="mt-1 list-disc pl-5">
            {e.bullets.map((b, j) => (
              <li key={j}>{b}</li>
            ))}
          </ul>
        </div>
      ))}

      {resume.projects.length > 0 && (
        <>
          <Heading>Projects</Heading>
          {resume.projects.map((p, i) => (
            <div key={i} className="mt-2">
              <div className="font-bold">
                {p.name}
                {p.technologies.length > 0 && (
                  <span className="font-normal italic"> — {p.technologies.join(", ")}</span>
                )}
              </div>
              <ul className="mt-1 list-disc pl-5">
                {p.bullets.map((b, j) => (
                  <li key={j}>{b}</li>
                ))}
              </ul>
            </div>
          ))}
        </>
      )}

      <Heading>Education</Heading>
      {resume.education.map((ed, i) => (
        <div key={i} className="mt-2">
          <div className="font-bold">{ed.school}</div>
          {ed.location && <div>{ed.location}</div>}
          <div className="flex justify-between">
            <span className="italic">{ed.degree}</span>
            {ed.dates && <span>{ed.dates}</span>}
          </div>
          {ed.gpa && <div>• GPA: {ed.gpa}</div>}
          {ed.honors && ed.honors.length > 0 && (
            <ul className="list-disc pl-5">
              {ed.honors.map((h, j) => (
                <li key={j}>{h}</li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/resume/renderResumeTemplate.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/resume/renderResumeTemplate.tsx lib/resume/renderResumeTemplate.test.tsx
git commit -m "feat: add ATS resume template matching the PDF layout"
```

---

## Task 12: Resume validation

**Files:**
- Create: `lib/resume/validateResume.ts`
- Test: `lib/resume/validateResume.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/resume/validateResume.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { validateResume } from "./validateResume";
import { leonardoProfile } from "@/data/leonardo-profile";

describe("validateResume", () => {
  it("passes for the clean master profile", () => {
    const result = validateResume(leonardoProfile, leonardoProfile);
    expect(result.checks.find((c) => c.id === "sections")?.passed).toBe(true);
    expect(result.checks.find((c) => c.id === "no-fabrication")?.passed).toBe(true);
    expect(result.passedCount).toBeGreaterThanOrEqual(5);
  });

  it("flags a banned phrase in the summary", () => {
    const bad = { ...leonardoProfile, summary: "I am a results-driven team player." };
    const result = validateResume(bad, leonardoProfile);
    expect(result.checks.find((c) => c.id === "no-banned-phrases")?.passed).toBe(false);
  });

  it("flags a fabricated company not in the master profile", () => {
    const bad = {
      ...leonardoProfile,
      experience: [{ ...leonardoProfile.experience[0], company: "Google" }],
    };
    const result = validateResume(bad, leonardoProfile);
    expect(result.checks.find((c) => c.id === "no-fabrication")?.passed).toBe(false);
  });

  it("flags duplicate skills", () => {
    const bad = { ...leonardoProfile, skills: ["React", "react", "SQL"] };
    const result = validateResume(bad, leonardoProfile);
    expect(result.checks.find((c) => c.id === "no-duplicate-skills")?.passed).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/resume/validateResume.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `lib/resume/validateResume.ts`:
```ts
import type { Profile } from "@/types/profile";
import { normalizeKeyword } from "@/lib/matching/normalizeKeyword";

export type ResumeCheck = { id: string; label: string; passed: boolean; detail?: string };
export type ValidationResult = { checks: ResumeCheck[]; passedCount: number; allPassed: boolean };

const BANNED_PHRASES = [
  "team player", "hard worker", "results-driven", "go-getter", "synergy",
  "think outside the box", "detail-oriented", "self-starter", "guru", "ninja", "rockstar",
];

const MAX_BULLET_LEN = 220;

export function validateResume(resume: Profile, master: Profile): ValidationResult {
  const checks: ResumeCheck[] = [];

  // 1. Required sections present
  const hasSections =
    !!resume.summary &&
    resume.skills.length > 0 &&
    resume.experience.length > 0 &&
    resume.education.length > 0;
  checks.push({ id: "sections", label: "All required sections present", passed: hasSections });

  // 2. One-column / ATS layout — always true by construction of the template
  checks.push({ id: "one-column", label: "One-column ATS format", passed: true });

  // 3. No duplicate skills (after normalization)
  const normedSkills = resume.skills.map(normalizeKeyword);
  const noDupes = new Set(normedSkills).size === normedSkills.length;
  checks.push({ id: "no-duplicate-skills", label: "No duplicate skills", passed: noDupes });

  // 4. Bullets within length
  const allBullets = [
    ...resume.experience.flatMap((e) => e.bullets),
    ...resume.projects.flatMap((p) => p.bullets),
  ];
  const bulletsOk = allBullets.every((b) => b.length <= MAX_BULLET_LEN);
  checks.push({ id: "bullet-length", label: "Bullets within length", passed: bulletsOk });

  // 5. No banned phrases anywhere in prose
  const prose = [resume.summary, ...allBullets].join(" ").toLowerCase();
  const banned = BANNED_PHRASES.find((p) => prose.includes(p));
  checks.push({
    id: "no-banned-phrases",
    label: "No clichéd/banned phrases",
    passed: !banned,
    detail: banned ? `Found: "${banned}"` : undefined,
  });

  // 6. No fabrication: companies / schools / degrees / dates must match the master verbatim
  const masterCompanies = new Set(master.experience.map((e) => e.company));
  const masterSchools = new Set(master.education.map((e) => e.school));
  const masterDegrees = new Set(master.education.map((e) => e.degree));
  const companiesOk = resume.experience.every((e) => masterCompanies.has(e.company));
  const schoolsOk = resume.education.every((e) => masterSchools.has(e.school));
  const degreesOk = resume.education.every((e) => masterDegrees.has(e.degree));
  checks.push({
    id: "no-fabrication",
    label: "No fabricated employers or credentials",
    passed: companiesOk && schoolsOk && degreesOk,
  });

  // 7. Export ready = everything above passed
  const coreOk = checks.every((c) => c.passed);
  checks.push({ id: "export-ready", label: "Export-ready", passed: coreOk });

  const passedCount = checks.filter((c) => c.passed).length;
  return { checks, passedCount, allPassed: checks.every((c) => c.passed) };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/resume/validateResume.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/resume/validateResume.ts lib/resume/validateResume.test.ts
git commit -m "feat: add resume validation (sections, banned phrases, no-fabrication)"
```

---

## Task 13: Cloudflare Workers AI REST helper

**Files:**
- Create: `lib/cloudflare/callWorkersAI.ts`
- Test: `lib/cloudflare/callWorkersAI.test.ts`

- [ ] **Step 1: Write the failing test (mock fetch)**

Create `lib/cloudflare/callWorkersAI.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { callWorkersAI } from "./callWorkersAI";

describe("callWorkersAI", () => {
  beforeEach(() => {
    process.env.CLOUDFLARE_API_TOKEN = "test-token";
    process.env.CLOUDFLARE_ACCOUNT_ID = "acct-123";
    delete process.env.CLOUDFLARE_MODEL;
  });
  afterEach(() => vi.restoreAllMocks());

  it("posts to the correct URL with auth header and returns parsed JSON from result.response", async () => {
    const payload = { jobTitle: "Dev", technologies: ["React"] };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: { response: JSON.stringify(payload) }, success: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const out = await callWorkersAI({
      system: "sys",
      user: "job text",
      jsonSchema: { type: "object", properties: {} },
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      "https://api.cloudflare.com/client/v4/accounts/acct-123/ai/run/@cf/meta/llama-3.1-8b-instruct"
    );
    expect(init.headers.Authorization).toBe("Bearer test-token");
    expect(out).toEqual(payload);
  });

  it("accepts result.response that is already an object", async () => {
    const payload = { jobTitle: "Dev" };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: { response: payload }, success: true }),
    }));
    const out = await callWorkersAI({ system: "s", user: "u", jsonSchema: {} });
    expect(out).toEqual(payload);
  });

  it("throws when credentials are missing", async () => {
    delete process.env.CLOUDFLARE_API_TOKEN;
    await expect(callWorkersAI({ system: "s", user: "u", jsonSchema: {} })).rejects.toThrow(
      /not configured/i
    );
  });

  it("throws on non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => "unauthorized",
    }));
    await expect(callWorkersAI({ system: "s", user: "u", jsonSchema: {} })).rejects.toThrow(
      /401/
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/cloudflare/callWorkersAI.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `lib/cloudflare/callWorkersAI.ts`:
```ts
type CallArgs = {
  system: string;
  user: string;
  jsonSchema: unknown;
  maxTokens?: number;
};

const DEFAULT_MODEL = "@cf/meta/llama-3.1-8b-instruct";

export async function callWorkersAI<T = unknown>({
  system,
  user,
  jsonSchema,
  maxTokens = 2000,
}: CallArgs): Promise<T> {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!token || !accountId) {
    throw new Error("Cloudflare Workers AI is not configured (missing CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID).");
  }
  const model = process.env.CLOUDFLARE_MODEL || DEFAULT_MODEL;
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;

  const ac = new AbortController();
  const timeout = setTimeout(() => ac.abort(), 240_000); // 4 min, matches story-crafter

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        max_tokens: maxTokens,
        response_format: {
          type: "json_schema",
          json_schema: jsonSchema,
        },
      }),
      signal: ac.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Cloudflare ${res.status}: ${text || "no body"}`);
    }

    const data = await res.json();
    const response = data?.result?.response;
    if (response == null) {
      throw new Error("Cloudflare returned no result.response");
    }
    // JSON Mode may return an object directly or a JSON string.
    if (typeof response === "string") {
      return JSON.parse(response) as T;
    }
    return response as T;
  } finally {
    clearTimeout(timeout);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/cloudflare/callWorkersAI.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/cloudflare/callWorkersAI.ts lib/cloudflare/callWorkersAI.test.ts
git commit -m "feat: add Cloudflare Workers AI REST helper with JSON mode"
```

---

## Task 14: Prompts + JSON schemas for the two AI calls

**Files:**
- Create: `lib/cloudflare/prompts.ts`
- Create: `lib/cloudflare/jsonSchemas.ts`
- Test: `lib/cloudflare/jsonSchemas.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/cloudflare/jsonSchemas.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { jobAnalysisJsonSchema, generatedResumeJsonSchema } from "./jsonSchemas";

describe("json schemas", () => {
  it("job analysis schema declares the required keys", () => {
    const props = (jobAnalysisJsonSchema as any).properties;
    expect(Object.keys(props)).toEqual(
      expect.arrayContaining([
        "jobTitle", "technologies", "hardSkills", "softSkills",
        "responsibilities", "preferredQualifications", "atsKeywords",
      ])
    );
  });
  it("generated resume schema declares experience and education", () => {
    const props = (generatedResumeJsonSchema as any).properties;
    expect(props.experience).toBeDefined();
    expect(props.education).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/cloudflare/jsonSchemas.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create the JSON schemas**

Create `lib/cloudflare/jsonSchemas.ts`:
```ts
const stringArray = { type: "array", items: { type: "string" } };

export const jobAnalysisJsonSchema = {
  type: "object",
  properties: {
    jobTitle: { type: "string" },
    companyName: { type: "string" },
    technologies: stringArray,
    hardSkills: stringArray,
    softSkills: stringArray,
    responsibilities: stringArray,
    preferredQualifications: stringArray,
    atsKeywords: stringArray,
  },
  required: ["jobTitle", "technologies", "hardSkills", "softSkills", "responsibilities", "atsKeywords"],
};

const bulletEntry = (extra: Record<string, unknown>) => ({
  type: "object",
  properties: { ...extra, bullets: stringArray },
});

export const generatedResumeJsonSchema = {
  type: "object",
  properties: {
    name: { type: "string" },
    title: { type: "string" },
    contact: {
      type: "object",
      properties: {
        email: { type: "string" }, phone: { type: "string" }, location: { type: "string" },
        github: { type: "string" }, portfolio: { type: "string" }, linkedin: { type: "string" },
      },
    },
    summary: { type: "string" },
    skills: stringArray,
    experience: {
      type: "array",
      items: bulletEntry({
        company: { type: "string" }, location: { type: "string" },
        role: { type: "string" }, dates: { type: "string" },
      }),
    },
    projects: {
      type: "array",
      items: bulletEntry({ name: { type: "string" }, technologies: stringArray }),
    },
    education: {
      type: "array",
      items: {
        type: "object",
        properties: {
          school: { type: "string" }, location: { type: "string" }, degree: { type: "string" },
          dates: { type: "string" }, gpa: { type: "string" }, honors: stringArray,
        },
      },
    },
  },
  required: ["name", "title", "contact", "summary", "skills", "experience", "education"],
};
```

- [ ] **Step 4: Create the prompts**

Create `lib/cloudflare/prompts.ts`:
```ts
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
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run lib/cloudflare/jsonSchemas.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add lib/cloudflare/jsonSchemas.ts lib/cloudflare/prompts.ts lib/cloudflare/jsonSchemas.test.ts
git commit -m "feat: add AI prompts and JSON schemas for analyze/generate"
```

---

## Task 15: `/api/analyze-job` route handler

**Files:**
- Create: `app/api/analyze-job/route.ts`
- Test: `app/api/analyze-job/route.test.ts`

> Read `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md` first.

- [ ] **Step 1: Write the failing test**

Create `app/api/analyze-job/route.test.ts`:
```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/api/analyze-job/route.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `app/api/analyze-job/route.ts`:
```ts
import { NextResponse } from "next/server";
import { callWorkersAI } from "@/lib/cloudflare/callWorkersAI";
import { ANALYZE_JOB_SYSTEM, analyzeJobUser } from "@/lib/cloudflare/prompts";
import { jobAnalysisJsonSchema } from "@/lib/cloudflare/jsonSchemas";
import { jobAnalysisSchema } from "@/schemas/job-analysis.schema";
import { analyzeGaps } from "@/lib/matching/analyzeGaps";
import { profileKeywords } from "@/data/leonardo-profile";
import type { JobAnalysis } from "@/types/job";

export const maxDuration = 300;

export async function POST(request: Request) {
  let body: { jobDescription?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const jobDescription =
    typeof body.jobDescription === "string" ? body.jobDescription.trim() : "";
  if (!jobDescription) {
    return NextResponse.json({ error: "Missing jobDescription" }, { status: 400 });
  }

  try {
    const raw = await callWorkersAI<unknown>({
      system: ANALYZE_JOB_SYSTEM,
      user: analyzeJobUser(jobDescription),
      jsonSchema: jobAnalysisJsonSchema,
    });
    const analysis = jobAnalysisSchema.parse(raw) as JobAnalysis;
    const gap = analyzeGaps(analysis, profileKeywords());
    return NextResponse.json({ analysis, gap });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/api/analyze-job/route.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add app/api/analyze-job/route.ts app/api/analyze-job/route.test.ts
git commit -m "feat: add /api/analyze-job route handler"
```

---

## Task 16: `/api/generate-resume` route handler

**Files:**
- Create: `app/api/generate-resume/route.ts`
- Test: `app/api/generate-resume/route.test.ts`

> Read the route-handlers doc first (see Task 15).

- [ ] **Step 1: Write the failing test**

Create `app/api/generate-resume/route.test.ts`:
```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/api/generate-resume/route.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `app/api/generate-resume/route.ts`:
```ts
import { NextResponse } from "next/server";
import { callWorkersAI } from "@/lib/cloudflare/callWorkersAI";
import { GENERATE_RESUME_SYSTEM, generateResumeUser } from "@/lib/cloudflare/prompts";
import { generatedResumeJsonSchema } from "@/lib/cloudflare/jsonSchemas";
import { generatedResumeSchema } from "@/schemas/resume.schema";
import { validateResume } from "@/lib/resume/validateResume";
import { removeDuplicates } from "@/lib/utils/removeDuplicates";
import { leonardoProfile } from "@/data/leonardo-profile";
import type { JobAnalysis } from "@/types/job";
import type { Profile } from "@/types/profile";

export const maxDuration = 300;

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

  try {
    const raw = await callWorkersAI<unknown>({
      system: GENERATE_RESUME_SYSTEM,
      user: generateResumeUser({
        profile: leonardoProfile,
        jobAnalysis: body.jobAnalysis,
        matchedKeywords: body.matchedKeywords ?? [],
        acceptedGapKeywords: body.acceptedGapKeywords ?? [],
      }),
      jsonSchema: generatedResumeJsonSchema,
    });

    const parsed = generatedResumeSchema.parse(raw) as Profile;

    // Enforce non-negotiable facts from the master profile (defense in depth).
    const resume: Profile = {
      ...parsed,
      name: leonardoProfile.name,
      contact: leonardoProfile.contact,
      experience: parsed.experience.map((e, i) => ({
        ...e,
        company: leonardoProfile.experience[i]?.company ?? e.company,
        role: leonardoProfile.experience[i]?.role ?? e.role,
        dates: leonardoProfile.experience[i]?.dates ?? e.dates,
        location: leonardoProfile.experience[i]?.location ?? e.location,
      })),
      education: leonardoProfile.education,
      skills: removeDuplicates(parsed.skills),
    };

    const validation = validateResume(resume, leonardoProfile);
    return NextResponse.json({ resume, validation });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/api/generate-resume/route.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add app/api/generate-resume/route.ts app/api/generate-resume/route.test.ts
git commit -m "feat: add /api/generate-resume route handler with validation"
```

---

## Task 17: Presentational components — analysis, score, keywords, gaps

**Files:**
- Create: `components/MatchScoreCard.tsx`
- Create: `components/KeywordSection.tsx`
- Create: `components/GapReviewPanel.tsx`
- Create: `components/JobAnalysisPanel.tsx`
- Test: `components/GapReviewPanel.test.tsx`

> Reference `stitch/job_analyzed_state/code.html` and `stitch/gaps_accepted_state/code.html`.

- [ ] **Step 1: Write the failing test for GapReviewPanel**

Create `components/GapReviewPanel.test.tsx`:
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GapReviewPanel } from "./GapReviewPanel";

describe("GapReviewPanel", () => {
  it("fires onAcceptAll when 'Accept All Gaps' clicked", async () => {
    const onAcceptAll = vi.fn();
    render(
      <GapReviewPanel
        gapKeywords={["React", "AWS"]}
        gapMode="verified_only"
        acceptedKeywords={[]}
        onAcceptAll={onAcceptAll}
        onVerifiedOnly={vi.fn()}
        onCustomize={vi.fn()}
        onToggleKeyword={vi.fn()}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /accept all gaps/i }));
    expect(onAcceptAll).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/GapReviewPanel.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Create the components**

Create `components/MatchScoreCard.tsx`:
```tsx
import { Card } from "./ui/Card";

export function MatchScoreCard({ current, potential }: { current: number; potential: number }) {
  return (
    <Card className="flex items-center justify-between gap-6">
      <div>
        <p className="text-xs font-medium uppercase text-[var(--color-on-surface-variant)]">
          Current Match
        </p>
        <p className="text-3xl font-bold text-[var(--color-primary)]">{current}%</p>
      </div>
      <div className="text-2xl text-[var(--color-on-surface-variant)]">→</div>
      <div>
        <p className="text-xs font-medium uppercase text-[var(--color-on-surface-variant)]">
          After Accepting Gaps
        </p>
        <p className="text-3xl font-bold text-[var(--color-emerald)]">{potential}%</p>
      </div>
    </Card>
  );
}
```

Create `components/KeywordSection.tsx`:
```tsx
import { Badge } from "./ui/Badge";

export function KeywordSection({
  title,
  keywords,
  tone,
}: {
  title: string;
  keywords: string[];
  tone: "matched" | "gap";
}) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      {keywords.length === 0 ? (
        <p className="text-sm text-[var(--color-on-surface-variant)]">None</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {keywords.map((k) => (
            <Badge key={k} tone={tone}>{k}</Badge>
          ))}
        </div>
      )}
    </div>
  );
}
```

Create `components/GapReviewPanel.tsx`:
```tsx
import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";
import type { GapMode } from "@/types/resume";
import { normalizeKeyword } from "@/lib/matching/normalizeKeyword";

export function GapReviewPanel({
  gapKeywords,
  gapMode,
  acceptedKeywords,
  onAcceptAll,
  onVerifiedOnly,
  onCustomize,
  onToggleKeyword,
}: {
  gapKeywords: string[];
  gapMode: GapMode;
  acceptedKeywords: string[];
  onAcceptAll: () => void;
  onVerifiedOnly: () => void;
  onCustomize: () => void;
  onToggleKeyword: (kw: string) => void;
}) {
  const acceptedSet = new Set(acceptedKeywords.map(normalizeKeyword));
  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--color-on-surface-variant)]">
        We found {gapKeywords.length} keyword{gapKeywords.length === 1 ? "" : "s"} not currently in your profile.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={onAcceptAll}>Accept All Gaps</Button>
        <Button variant="secondary" onClick={onVerifiedOnly}>Use Only Verified Profile</Button>
        <Button variant="ghost" onClick={onCustomize}>Customize List</Button>
      </div>
      {gapMode === "custom" && (
        <div className="flex flex-wrap gap-2">
          {gapKeywords.map((k) => {
            const on = acceptedSet.has(normalizeKeyword(k));
            return (
              <button key={k} onClick={() => onToggleKeyword(k)} type="button">
                <Badge tone={on ? "matched" : "gap"}>{on ? "✓ " : "+ "}{k}</Badge>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

Create `components/JobAnalysisPanel.tsx`:
```tsx
import { Card, CardTitle } from "./ui/Card";
import { MatchScoreCard } from "./MatchScoreCard";
import { KeywordSection } from "./KeywordSection";
import { GapReviewPanel } from "./GapReviewPanel";
import type { JobAnalysis } from "@/types/job";
import type { GapAnalysis, GapMode } from "@/types/resume";

export function JobAnalysisPanel({
  analysis,
  gap,
  liveScore,
  gapMode,
  acceptedKeywords,
  onAcceptAll,
  onVerifiedOnly,
  onCustomize,
  onToggleKeyword,
}: {
  analysis: JobAnalysis;
  gap: GapAnalysis;
  liveScore: number;
  gapMode: GapMode;
  acceptedKeywords: string[];
  onAcceptAll: () => void;
  onVerifiedOnly: () => void;
  onCustomize: () => void;
  onToggleKeyword: (kw: string) => void;
}) {
  return (
    <Card className="space-y-5">
      <CardTitle>Job Analysis</CardTitle>
      <p className="text-sm font-medium">
        {analysis.jobTitle}
        {analysis.companyName ? ` · ${analysis.companyName}` : ""}
      </p>
      <MatchScoreCard current={liveScore} potential={gap.potentialScore} />
      <KeywordSection title="Matched Keywords" keywords={gap.matchedKeywords} tone="matched" />
      <KeywordSection title="Missing Keywords (Gaps)" keywords={gap.gapKeywords} tone="gap" />
      <GapReviewPanel
        gapKeywords={gap.gapKeywords}
        gapMode={gapMode}
        acceptedKeywords={acceptedKeywords}
        onAcceptAll={onAcceptAll}
        onVerifiedOnly={onVerifiedOnly}
        onCustomize={onCustomize}
        onToggleKeyword={onToggleKeyword}
      />
    </Card>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/GapReviewPanel.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add components/MatchScoreCard.tsx components/KeywordSection.tsx components/GapReviewPanel.tsx components/JobAnalysisPanel.tsx components/GapReviewPanel.test.tsx
git commit -m "feat: add analysis/score/keyword/gap components"
```

---

## Task 18: Resume preview, checks, export, loading & error

**Files:**
- Create: `components/ResumePreview.tsx`
- Create: `components/ResumeChecks.tsx`
- Create: `components/ExportButtons.tsx`
- Create: `components/LoadingState.tsx`
- Create: `components/ErrorState.tsx`
- Create: `lib/resume/toPlainText.ts`
- Test: `lib/resume/toPlainText.test.ts`

> Reference `stitch/resume_generated_state/code.html`, `loading_states/code.html`, `error_state/code.html`.

- [ ] **Step 1: Write the failing test for plain-text export**

Create `lib/resume/toPlainText.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { resumeToPlainText } from "./toPlainText";
import { leonardoProfile } from "@/data/leonardo-profile";

describe("resumeToPlainText", () => {
  it("includes name, headings, and skills", () => {
    const text = resumeToPlainText(leonardoProfile);
    expect(text).toContain("LEONARDO LOPEZ");
    expect(text).toContain("PROFESSIONAL SUMMARY");
    expect(text).toContain("TECHNICAL SKILLS");
    expect(text).toContain("Python");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/resume/toPlainText.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create plain-text serializer**

Create `lib/resume/toPlainText.ts`:
```ts
import type { Profile } from "@/types/profile";

export function resumeToPlainText(r: Profile): string {
  const lines: string[] = [];
  lines.push(r.name.toUpperCase());
  const c = r.contact;
  lines.push([c.location, c.phone].filter(Boolean).join(" | "));
  lines.push([c.email, c.linkedin, c.portfolio].filter(Boolean).join(" | "));
  lines.push("", "PROFESSIONAL SUMMARY", r.summary);
  lines.push("", "TECHNICAL SKILLS", r.skills.join(" • "));
  lines.push("", "PROFESSIONAL EXPERIENCE");
  for (const e of r.experience) {
    lines.push(`${e.company}${e.location ? ` — ${e.location}` : ""}`);
    lines.push(`${e.role}  (${e.dates})`);
    for (const b of e.bullets) lines.push(`• ${b}`);
  }
  if (r.projects.length) {
    lines.push("", "PROJECTS");
    for (const p of r.projects) {
      lines.push(`${p.name}${p.technologies.length ? ` — ${p.technologies.join(", ")}` : ""}`);
      for (const b of p.bullets) lines.push(`• ${b}`);
    }
  }
  lines.push("", "EDUCATION");
  for (const ed of r.education) {
    lines.push(ed.school);
    lines.push(`${ed.degree}${ed.dates ? `  (${ed.dates})` : ""}`);
    if (ed.gpa) lines.push(`GPA: ${ed.gpa}`);
    if (ed.honors) for (const h of ed.honors) lines.push(`• ${h}`);
  }
  return lines.join("\n");
}
```

- [ ] **Step 4: Create the components**

Create `components/ResumePreview.tsx`:
```tsx
import { ResumeTemplate } from "@/lib/resume/renderResumeTemplate";
import type { Profile } from "@/types/profile";

export function ResumePreview({ resume }: { resume: Profile }) {
  return (
    <div className="overflow-auto rounded-lg border border-[var(--color-outline)] bg-white">
      <ResumeTemplate resume={resume} />
    </div>
  );
}
```

Create `components/ResumeChecks.tsx`:
```tsx
import { Card, CardTitle } from "./ui/Card";
import type { ValidationResult } from "@/lib/resume/validateResume";

export function ResumeChecks({ validation }: { validation: ValidationResult }) {
  return (
    <Card className="space-y-3">
      <CardTitle>Resume Checks</CardTitle>
      <ul className="space-y-2 text-sm">
        {validation.checks.map((c) => (
          <li key={c.id} className="flex items-center gap-2">
            <span className={c.passed ? "text-[var(--color-emerald)]" : "text-[var(--color-rose)]"}>
              {c.passed ? "✓" : "✕"}
            </span>
            <span>{c.label}</span>
            {c.detail && <span className="text-[var(--color-rose)]">— {c.detail}</span>}
          </li>
        ))}
      </ul>
    </Card>
  );
}
```

Create `components/ExportButtons.tsx`:
```tsx
"use client";
import { Button } from "./ui/Button";
import { resumeToPlainText } from "@/lib/resume/toPlainText";
import type { Profile } from "@/types/profile";

export function ExportButtons({ resume, onRegenerate }: { resume: Profile; onRegenerate: () => void }) {
  async function copyText() {
    await navigator.clipboard.writeText(resumeToPlainText(resume));
  }
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" onClick={copyText}>Copy Text</Button>
      <Button variant="secondary" onClick={() => window.print()}>Download PDF</Button>
      <Button variant="ghost" onClick={onRegenerate}>Regenerate</Button>
    </div>
  );
}
```

Create `components/LoadingState.tsx`:
```tsx
export function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-[var(--color-on-surface-variant)]">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
      {label}
    </div>
  );
}
```

Create `components/ErrorState.tsx`:
```tsx
import { Button } from "./ui/Button";

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-lg border border-[var(--color-rose)] bg-[var(--color-rose-bg)] p-4 text-sm">
      <p className="font-medium text-[var(--color-rose)]">Something went wrong</p>
      <p className="mt-1 text-[var(--color-on-surface-variant)]">{message}</p>
      <Button variant="secondary" className="mt-3" onClick={onRetry}>Try again</Button>
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run lib/resume/toPlainText.test.ts`
Expected: PASS (1 test).

- [ ] **Step 6: Commit**

```bash
git add components/ResumePreview.tsx components/ResumeChecks.tsx components/ExportButtons.tsx components/LoadingState.tsx components/ErrorState.tsx lib/resume/toPlainText.ts lib/resume/toPlainText.test.ts
git commit -m "feat: add preview, checks, export, loading, error components"
```

---

## Task 19: Header + page orchestration (wire everything)

**Files:**
- Create: `components/Header.tsx`
- Create: `components/JobDescriptionInput.tsx`
- Replace: `app/page.tsx`

- [ ] **Step 1: Create Header**

Create `components/Header.tsx`:
```tsx
export function Header() {
  return (
    <header className="flex items-center justify-between border-b border-[var(--color-outline)] bg-white px-6 py-4">
      <div>
        <h1 className="text-xl font-bold text-[var(--color-primary)]">JobFit Resume</h1>
        <p className="text-xs text-[var(--color-on-surface-variant)]">AI-powered ATS resume tailoring</p>
      </div>
      <span className="rounded-full bg-[var(--color-surface)] px-3 py-1 text-xs text-[var(--color-on-surface-variant)]">
        No login required
      </span>
    </header>
  );
}
```

- [ ] **Step 2: Create JobDescriptionInput**

Create `components/JobDescriptionInput.tsx`:
```tsx
"use client";
import { Textarea } from "./ui/Textarea";
import { Button } from "./ui/Button";

export function JobDescriptionInput({
  value,
  onChange,
  onAnalyze,
  onClear,
  loading,
}: {
  value: string;
  onChange: (v: string) => void;
  onAnalyze: () => void;
  onClear: () => void;
  loading: boolean;
}) {
  return (
    <div className="space-y-3">
      <Textarea
        rows={14}
        placeholder="Paste the job description here..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <p className="text-xs text-[var(--color-on-surface-variant)]">
        The more complete the description, the better the keyword extraction.
      </p>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClear}>Clear</Button>
        <Button variant="primary" onClick={onAnalyze} disabled={loading || !value.trim()}>
          {loading ? "Analyzing…" : "Analyze Job"}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Replace `app/page.tsx` with the full orchestration**

Replace the entire contents of `app/page.tsx`:
```tsx
"use client";

import { useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { Card, CardTitle } from "@/components/ui/Card";
import { JobDescriptionInput } from "@/components/JobDescriptionInput";
import { JobAnalysisPanel } from "@/components/JobAnalysisPanel";
import { ResumePreview } from "@/components/ResumePreview";
import { ResumeChecks } from "@/components/ResumeChecks";
import { ExportButtons } from "@/components/ExportButtons";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";
import { Button } from "@/components/ui/Button";
import { normalizeKeyword } from "@/lib/matching/normalizeKeyword";
import { calculateMatchScore } from "@/lib/matching/calculateMatchScore";
import { profileKeywords } from "@/data/leonardo-profile";
import type { JobAnalysis } from "@/types/job";
import type { GapAnalysis, GapMode } from "@/types/resume";
import type { Profile } from "@/types/profile";
import type { ValidationResult } from "@/lib/resume/validateResume";

export default function Page() {
  const [jd, setJd] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [analysis, setAnalysis] = useState<JobAnalysis | null>(null);
  const [gap, setGap] = useState<GapAnalysis | null>(null);
  const [gapMode, setGapMode] = useState<GapMode>("verified_only");
  const [accepted, setAccepted] = useState<string[]>([]);

  const [resume, setResume] = useState<Profile | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);

  const liveScore = useMemo(() => {
    if (!analysis) return 0;
    return calculateMatchScore(analysis, [...profileKeywords(), ...accepted]);
  }, [analysis, accepted]);

  async function analyze() {
    setAnalyzing(true);
    setError(null);
    setResume(null);
    try {
      const res = await fetch("/api/analyze-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription: jd }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Analysis failed");
      setAnalysis(json.analysis);
      setGap(json.gap);
      setGapMode("verified_only");
      setAccepted([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }

  function acceptAll() {
    if (!gap) return;
    setGapMode("accept_all");
    setAccepted([...gap.gapKeywords]);
  }
  function verifiedOnly() {
    setGapMode("verified_only");
    setAccepted([]);
  }
  function customize() {
    setGapMode("custom");
  }
  function toggleKeyword(kw: string) {
    const n = normalizeKeyword(kw);
    setAccepted((prev) =>
      prev.some((k) => normalizeKeyword(k) === n) ? prev.filter((k) => normalizeKeyword(k) !== n) : [...prev, kw]
    );
  }

  async function generate() {
    if (!analysis || !gap) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobAnalysis: analysis,
          matchedKeywords: gap.matchedKeywords,
          acceptedGapKeywords: accepted,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Generation failed");
      setResume(json.resume);
      setValidation(json.validation);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  function clearAll() {
    setJd("");
    setAnalysis(null);
    setGap(null);
    setResume(null);
    setValidation(null);
    setError(null);
  }

  return (
    <main className="min-h-full">
      <Header />
      <div className="mx-auto max-w-[1440px] space-y-6 p-6">
        <section className="grid gap-6 lg:grid-cols-2">
          <Card className="space-y-4">
            <CardTitle>1. Paste Job Description</CardTitle>
            <JobDescriptionInput
              value={jd}
              onChange={setJd}
              onAnalyze={analyze}
              onClear={clearAll}
              loading={analyzing}
            />
          </Card>

          <div className="space-y-4">
            {analyzing && (
              <Card><LoadingState label="Analyzing job description…" /></Card>
            )}
            {error && !analyzing && <ErrorState message={error} onRetry={analyze} />}
            {analysis && gap && !analyzing && (
              <JobAnalysisPanel
                analysis={analysis}
                gap={gap}
                liveScore={liveScore}
                gapMode={gapMode}
                acceptedKeywords={accepted}
                onAcceptAll={acceptAll}
                onVerifiedOnly={verifiedOnly}
                onCustomize={customize}
                onToggleKeyword={toggleKeyword}
              />
            )}
            {analysis && gap && !analyzing && (
              <Button variant="primary" onClick={generate} disabled={generating}>
                {generating ? "Generating…" : "Generate Resume"}
              </Button>
            )}
          </div>
        </section>

        {generating && <Card><LoadingState label="Generating tailored resume…" /></Card>}

        {resume && validation && (
          <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <Card className="space-y-4">
              <div className="flex items-center justify-between">
                <CardTitle>Generated Resume</CardTitle>
                <ExportButtons resume={resume} onRegenerate={generate} />
              </div>
              <ResumePreview resume={resume} />
            </Card>
            <ResumeChecks validation={validation} />
          </section>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Run full test suite + build**

Run: `npm run test`
Expected: all suites pass.

Run: `npm run build`
Expected: build succeeds, `/`, `/api/analyze-job`, `/api/generate-resume` compiled.

- [ ] **Step 5: Commit**

```bash
git add components/Header.tsx components/JobDescriptionInput.tsx app/page.tsx
git commit -m "feat: wire up single-page JobFit flow"
```

---

## Task 20: Environment example, README, manual verification

**Files:**
- Create: `.env.example`
- Create: `.gitignore` entry check (ensure `.env.local` ignored)
- Modify: `README.md`

- [ ] **Step 1: Create `.env.example`**

Create `.env.example`:
```
# Cloudflare Workers AI (REST). Token needs Workers AI Read + Edit.
CLOUDFLARE_API_TOKEN=your-cloudflare-api-token
CLOUDFLARE_ACCOUNT_ID=your-account-id
# Optional model override:
# CLOUDFLARE_MODEL=@cf/meta/llama-3.1-8b-instruct
```

- [ ] **Step 2: Ensure `.env.local` is git-ignored**

Run: `git check-ignore .env.local || echo ".env.local" >> .gitignore`
Expected: either already ignored, or appended.

- [ ] **Step 3: Write README usage section**

Replace `README.md` with:
```markdown
# JobFit Resume — AI-Powered ATS Resume Tailor

Paste a job description, review matched vs. missing keywords, click **Accept All Gaps**, and generate an ATS-friendly resume you can export to PDF (print) or copy as plain text.

## Stack
Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Zod · Cloudflare Workers AI (REST). Hosted on Vercel; AI runs on Cloudflare.

## Setup
1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in `CLOUDFLARE_API_TOKEN` (Workers AI Read+Edit) and `CLOUDFLARE_ACCOUNT_ID`.
3. `npm run dev` → http://localhost:3000

## Deploy (Vercel)
Set `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` (and optional `CLOUDFLARE_MODEL`) as Vercel environment variables, then deploy. No Cloudflare Worker or Wrangler needed — the Next.js route handlers call the Cloudflare REST API directly.

## Tests
`npm run test`
```

- [ ] **Step 4: Manual end-to-end verification**

Run: `npm run dev`
Then, with real Cloudflare credentials in `.env.local`, in a browser at http://localhost:3000:
1. Paste a real job description → click **Analyze Job** → confirm job title, matched/gap keywords, and a current→potential score appear.
2. Click **Accept All Gaps** → confirm the live score rises toward the potential score.
3. Click **Generate Resume** → confirm the ATS preview renders with Leonardo's real company/education unchanged and a tailored summary, and the Resume Checks list shows passing checks.
4. Click **Download PDF** → confirm the browser print dialog shows only the resume (isolated by print CSS).
5. Click **Copy Text** → paste elsewhere → confirm plain-text resume.

Expected: all five steps succeed. If Cloudflare returns errors, verify token scopes and account ID.

- [ ] **Step 5: Commit**

```bash
git add .env.example README.md .gitignore
git commit -m "docs: add env example and README; verify e2e flow"
```

---

## Final verification checklist

- [ ] `npm run test` — all suites pass
- [ ] `npm run build` — succeeds
- [ ] `npx tsc --noEmit` — no type errors
- [ ] Manual flow (Task 20 Step 4) verified with real Cloudflare credentials
- [ ] `.env.local` is NOT committed; `.env.example` IS committed
- [ ] Generated resume never alters company/school/degree/dates from the master profile
