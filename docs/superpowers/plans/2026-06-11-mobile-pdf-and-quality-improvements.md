# Mobile PDF Export Fix + Quality Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the mobile resume-PDF export (currently captures the whole page), make the app fully responsive on phones, and raise the quality of cover letters, keyword matching, and job-post analysis.

**Architecture:** The resume PDF moves from `window.print()` (broken on mobile browsers — they print the whole document and `afterprint` is unreliable) to a programmatic jsPDF document, exactly the approach the cover letter already uses successfully (`lib/coverLetter/exportToPdf.ts`). Responsiveness is handled with Tailwind breakpoint classes plus a scale-to-fit wrapper for the fixed 8.5in resume preview. Quality improvements are prompt + normalization + post-processing changes; no schema changes.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind v4, jsPDF 4, Zod 4, Vitest 4, Cloudflare Workers AI (`callWorkersAI`).

**⚠️ Project caveat (from AGENTS.md):** This repo's Next.js version differs from training data. Before editing anything under `app/api/`, read the relevant guide in `node_modules/next/dist/docs/`. Route handler changes in this plan are minimal (one import + one wrapped call), but check the docs anyway.

**Run tests with:** `npm run test` (vitest run). Run from the repo root `jobfit_resume/`.

**Existing print machinery stays:** `app/print-check/page.tsx`, the `@media print` block in `app/globals.css`, and `scripts/check-resume-pdf.mjs` (puppeteer) are kept — they are an independent verification path. Only the user-facing Download PDF button changes.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `lib/resume/exportToPdf.ts` | Create | Programmatic jsPDF resume document with one-page fit |
| `lib/resume/exportToPdf.test.ts` | Create | One-page fit + content tests |
| `components/ExportButtons.tsx` | Modify | Use jsPDF export instead of `window.print()` |
| `components/ExportButtons.test.tsx` | Create | Button wiring test (mocked export lib) |
| `components/ResumePreview.tsx` | Modify | Scale 8.5in template down to phone width |
| `vitest.setup.ts` | Modify | `ResizeObserver` stub for jsdom |
| `components/Header.tsx` | Modify | Mobile paddings, hide badge on small screens |
| `app/page.tsx` | Modify | Mobile paddings, hero sizes, stacked button rows |
| `components/ui/Card.tsx` | Modify | Smaller padding on mobile |
| `components/ui/Button.tsx` | Modify | 44px touch targets |
| `lib/matching/normalizeKeyword.ts` | Modify | More aliases + plural folding |
| `lib/matching/normalizeKeyword.test.ts` | Modify | New alias/plural tests |
| `lib/matching/cleanJobAnalysis.ts` | Create | Cross-list dedupe + sentence filtering of analysis |
| `lib/matching/cleanJobAnalysis.test.ts` | Create | Tests for the above |
| `app/api/analyze-job/route.ts` | Modify | Apply `cleanJobAnalysis` after parse |
| `lib/cloudflare/prompts.ts` | Modify | Sharper analysis + cover-letter prompts |
| `lib/cloudflare/callWorkersAI.ts` | Modify | Stronger default model |
| `app/api/generate-cover-letter/route.ts` | Modify | Raise coverage target to 80 |
| `components/JobAnalysisPanel.tsx` | Modify | Show responsibilities + preferred qualifications |

---

### Task 1: Programmatic resume PDF (`lib/resume/exportToPdf.ts`)

This is the mobile bug fix. `window.print()` on iOS/Android prints the whole page; jsPDF builds the PDF in JS and triggers a normal file download, which works on every mobile browser (proven by the cover letter path).

**Files:**
- Create: `lib/resume/exportToPdf.ts`
- Test: `lib/resume/exportToPdf.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/resume/exportToPdf.test.ts
import { describe, expect, it } from "vitest";
import { jsPDF } from "jspdf";
import {
  RESUME_PAGE_LIMIT,
  fitResumeScale,
  measureResume,
  buildResumePdf,
} from "./exportToPdf";
import { leonardoProfile } from "@/data/leonardo-profile";
import type { Profile } from "@/types/profile";

function newDoc() {
  return new jsPDF({ unit: "in", format: "letter", orientation: "portrait" });
}

// A profile bloated to roughly double length, to force the fit loop to shrink.
function bloatedProfile(): Profile {
  const extraBullets = (bullets: string[]) => [
    ...bullets,
    ...bullets.map((b) => `${b} Additionally, repeated for length padding purposes.`),
  ];
  return {
    ...leonardoProfile,
    experience: leonardoProfile.experience.flatMap((e) => [
      e,
      { ...e, bullets: extraBullets(e.bullets) },
    ]),
    projects: leonardoProfile.projects.flatMap((p) => [
      p,
      { ...p, bullets: extraBullets(p.bullets) },
    ]),
  };
}

describe("measureResume / fitResumeScale", () => {
  it("measures a positive height at scale 1", () => {
    const doc = newDoc();
    expect(measureResume(doc, leonardoProfile, 1)).toBeGreaterThan(1);
  });

  it("returns a scale that fits the normal profile on one page", () => {
    const doc = newDoc();
    const scale = fitResumeScale(doc, leonardoProfile);
    expect(scale).toBeGreaterThan(0.4);
    expect(scale).toBeLessThanOrEqual(1);
    expect(measureResume(doc, leonardoProfile, scale)).toBeLessThanOrEqual(RESUME_PAGE_LIMIT);
  });

  it("shrinks a bloated profile until it fits one page", () => {
    const doc = newDoc();
    const fat = bloatedProfile();
    const scale = fitResumeScale(doc, fat);
    expect(scale).toBeLessThan(1);
    expect(measureResume(doc, fat, scale)).toBeLessThanOrEqual(RESUME_PAGE_LIMIT);
  });
});

describe("buildResumePdf", () => {
  it("produces a single-page document with content", () => {
    const doc = newDoc();
    buildResumePdf(doc, leonardoProfile);
    expect(doc.getNumberOfPages()).toBe(1);
    expect(doc.output("datauristring").length).toBeGreaterThan(1000);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- lib/resume/exportToPdf.test.ts`
Expected: FAIL — `Cannot find module './exportToPdf'` (or equivalent resolution error).

- [ ] **Step 3: Write the implementation**

```ts
// lib/resume/exportToPdf.ts
import type { Profile } from "@/types/profile";
import type { jsPDF } from "jspdf";

const PAGE_W = 8.5;
const PAGE_H = 11;
const MARGIN = 0.6;
const CONTENT_W = PAGE_W - MARGIN * 2;
const LH = 1.25; // line-height factor, matches leading-snug closely enough

// The drawn content's bottom edge must stay above this (inches).
export const RESUME_PAGE_LIMIT = PAGE_H - MARGIN;

// Mirrors renderResumeTemplate's toHref.
function toHref(kind: "email" | "url", value: string): string {
  if (kind === "email") return `mailto:${value}`;
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

type Segment = { text: string; url?: string };

// Draws (or, when dry, only measures) the resume at the given scale.
// Returns the y coordinate of the last baseline in inches.
export function measureResume(doc: jsPDF, resume: Profile, scale: number): number {
  return draw(doc, resume, scale, true);
}

export function fitResumeScale(doc: jsPDF, resume: Profile): number {
  let scale = 1;
  for (let i = 0; i < 8; i++) {
    const h = draw(doc, resume, scale, true);
    if (h <= RESUME_PAGE_LIMIT) break;
    scale *= (RESUME_PAGE_LIMIT / h) * 0.99;
  }
  return scale;
}

export function buildResumePdf(doc: jsPDF, resume: Profile): void {
  draw(doc, resume, fitResumeScale(doc, resume), false);
}

export async function exportResumeToPdf(resume: Profile): Promise<void> {
  // Dynamic import keeps jsPDF out of the server bundle (same as cover letter).
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "in", format: "letter", orientation: "portrait" });
  buildResumePdf(doc, resume);
  doc.save("resume.pdf");
}

function draw(doc: jsPDF, resume: Profile, scale: number, dry: boolean): number {
  let y = MARGIN;
  const lh = (size: number) => (size * scale * LH) / 72;

  function setFont(size: number, style: "normal" | "bold" | "italic" = "normal") {
    doc.setFont("times", style);
    doc.setFontSize(size * scale);
  }

  function para(text: string, size: number, style: "normal" | "bold" | "italic" = "normal") {
    setFont(size, style);
    const lines = doc.splitTextToSize(text, CONTENT_W) as string[];
    for (const ln of lines) {
      y += lh(size);
      if (!dry) doc.text(ln, MARGIN, y);
    }
  }

  function bullet(text: string, size: number) {
    setFont(size, "normal");
    const indent = 0.18;
    const lines = doc.splitTextToSize(text, CONTENT_W - indent) as string[];
    lines.forEach((ln, i) => {
      y += lh(size);
      if (!dry) {
        if (i === 0) doc.text("•", MARGIN + 0.02, y);
        doc.text(ln, MARGIN + indent, y);
      }
    });
  }

  function heading(text: string) {
    y += lh(11) * 1.5;
    setFont(11, "bold");
    if (!dry) {
      doc.text(text.toUpperCase(), MARGIN, y);
      doc.setLineWidth(0.008);
      doc.line(MARGIN, y + 0.035, PAGE_W - MARGIN, y + 0.035);
    }
    y += 0.05;
  }

  function row(left: string, right: string, size: number) {
    y += lh(size);
    if (!dry) {
      setFont(size, "italic");
      doc.text(left, MARGIN, y);
      setFont(size, "normal");
      doc.text(right, PAGE_W - MARGIN, y, { align: "right" });
    }
  }

  function centeredSegments(segments: Segment[], size: number) {
    setFont(size, "normal");
    y += lh(size);
    const total = segments.reduce((w, s) => w + doc.getTextWidth(s.text), 0);
    let x = (PAGE_W - total) / 2;
    for (const s of segments) {
      if (!dry) {
        if (s.url) {
          doc.setTextColor(17, 85, 204);
          doc.textWithLink(s.text, x, y, { url: s.url });
          doc.setTextColor(0, 0, 0);
        } else {
          doc.text(s.text, x, y);
        }
      }
      x += doc.getTextWidth(s.text);
    }
  }

  const c = resume.contact;

  // Header: name, location | phone, then link line.
  setFont(20, "bold");
  y += lh(20);
  if (!dry) doc.text(resume.name.toUpperCase(), PAGE_W / 2, y, { align: "center" });

  const contactBits = [c.location, c.phone].filter(Boolean) as string[];
  centeredSegments(
    contactBits.flatMap((t, i): Segment[] =>
      i > 0 ? [{ text: " | " }, { text: t }] : [{ text: t }],
    ),
    10,
  );

  const links: Segment[] = [];
  const push = (text: string | undefined, kind: "email" | "url") => {
    if (!text) return;
    if (links.length > 0) links.push({ text: " | " });
    links.push({ text, url: toHref(kind, text) });
  };
  push(c.email, "email");
  push(c.linkedin, "url");
  push(c.portfolio, "url");
  push(c.github, "url");
  if (links.length > 0) centeredSegments(links, 10);

  heading("Professional Summary");
  para(resume.summary, 10.5);

  heading("Technical Skills");
  para(resume.skills.join(" • "), 10.5);

  heading("Professional Experience");
  for (const e of resume.experience) {
    y += lh(10.5) * 0.4;
    para(e.company, 10.5, "bold");
    if (e.location) para(e.location, 10.5);
    row(e.role, e.dates, 10.5);
    for (const b of e.bullets) bullet(b, 10.5);
  }

  if (resume.projects.length > 0) {
    heading("Projects");
    for (const p of resume.projects) {
      y += lh(10.5) * 0.4;
      const title =
        p.technologies.length > 0
          ? `${p.name} — ${p.technologies.join(", ")}`
          : p.name;
      para(title, 10.5, "bold");
      for (const b of p.bullets) bullet(b, 10.5);
    }
  }

  heading("Education");
  for (const edu of resume.education) {
    y += lh(10.5) * 0.4;
    para(edu.school, 10.5, "bold");
    if (edu.location) para(edu.location, 10.5);
    row(edu.degree, edu.dates ?? "", 10.5);
    if (edu.gpa) bullet(`GPA: ${edu.gpa}`, 10.5);
    for (const h of edu.honors ?? []) bullet(h, 10.5);
  }

  return y;
}
```

Note on `row()` during dry runs: it advances `y` identically whether or not it draws, so measurement and drawing always agree. `doc.getTextWidth` and `doc.splitTextToSize` depend on the active font set by `setFont` — keep the `setFont` calls before them, as written.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- lib/resume/exportToPdf.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Open the PDF visually (sanity check)**

Add a temporary script or use the node REPL is awkward in WSL; instead defer the visual check to Task 2 Step 5 (browser download). Nothing to do here beyond tests passing.

- [ ] **Step 6: Commit**

```bash
git add lib/resume/exportToPdf.ts lib/resume/exportToPdf.test.ts
git commit -m "feat: programmatic jsPDF resume export with one-page fit"
```

---

### Task 2: Wire Download PDF button to jsPDF export

**Files:**
- Modify: `components/ExportButtons.tsx`
- Test: `components/ExportButtons.test.tsx` (create)

- [ ] **Step 1: Write the failing test**

```tsx
// components/ExportButtons.test.tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExportButtons } from "./ExportButtons";
import { leonardoProfile } from "@/data/leonardo-profile";

vi.mock("@/lib/resume/exportToPdf", () => ({
  exportResumeToPdf: vi.fn().mockResolvedValue(undefined),
}));

import { exportResumeToPdf } from "@/lib/resume/exportToPdf";

describe("ExportButtons", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls exportResumeToPdf with the resume on Download PDF", async () => {
    render(
      <ExportButtons resume={leonardoProfile} onRegenerate={() => {}} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Download PDF" }));
    expect(exportResumeToPdf).toHaveBeenCalledWith(leonardoProfile);
  });

  it("does not call window.print", async () => {
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});
    render(
      <ExportButtons resume={leonardoProfile} onRegenerate={() => {}} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Download PDF" }));
    expect(printSpy).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- components/ExportButtons.test.tsx`
Expected: FAIL — `exportResumeToPdf` not called (component still uses `window.print`).

- [ ] **Step 3: Rewrite the component**

Replace the entire contents of `components/ExportButtons.tsx` with:

```tsx
"use client";
import { Button } from "./ui/Button";
import { resumeToPlainText } from "@/lib/resume/toPlainText";
import { exportResumeToPdf } from "@/lib/resume/exportToPdf";
import type { Profile } from "@/types/profile";

export function ExportButtons({
  resume,
  onRegenerate,
  editing = false,
  onToggleEdit,
}: {
  resume: Profile;
  onRegenerate: () => void;
  editing?: boolean;
  onToggleEdit?: () => void;
}) {
  async function copyText() {
    await navigator.clipboard.writeText(resumeToPlainText(resume));
  }

  async function downloadPdf() {
    await exportResumeToPdf(resume);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" onClick={copyText}>Copy Text</Button>
      {onToggleEdit && (
        <Button variant="secondary" onClick={onToggleEdit}>
          {editing ? "Done" : "Edit"}
        </Button>
      )}
      <Button variant="secondary" onClick={downloadPdf}>Download PDF</Button>
      <Button variant="ghost" onClick={onRegenerate}>Regenerate</Button>
    </div>
  );
}
```

This deletes the `window.print()` hoisting logic and the `fitToOnePage` import. `fitToOnePage` is still used by `ResumePreview` (on-screen one-page fit) — do not delete `lib/resume/fitToOnePage.ts`. The `@media print` CSS in `app/globals.css` is still used by `app/print-check/page.tsx` + `scripts/check-resume-pdf.mjs` — leave it.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- components/ExportButtons.test.tsx`
Expected: PASS (2 tests). Then run the full suite: `npm run test` — expected all green.

- [ ] **Step 5: Visual verification in browser**

Run: `npm run dev`, open the app, generate (or load persisted) resume, click Download PDF.
Expected: `resume.pdf` downloads; one page; name centered; links clickable; section rules drawn. Compare side-by-side with the on-screen preview. Then open Chrome DevTools device emulation (iPhone) and click Download PDF again — file downloads instead of opening a print dialog.

- [ ] **Step 6: Commit**

```bash
git add components/ExportButtons.tsx components/ExportButtons.test.tsx
git commit -m "fix: resume Download PDF uses jsPDF, fixing whole-page capture on mobile"
```

---

### Task 3: Scale resume preview to phone width

The template is hard-sized `w-[8.5in]` (816 CSS px). On a ~390px phone it overflows and gets clipped by `overflow-hidden`. Scale it down with CSS `zoom` so the whole page is visible.

**Files:**
- Modify: `components/ResumePreview.tsx`
- Modify: `vitest.setup.ts` (ResizeObserver stub)

- [ ] **Step 1: Add a ResizeObserver stub to vitest.setup.ts**

Append to `vitest.setup.ts`:

```ts
// jsdom has no ResizeObserver; components that scale-to-fit need a no-op stub.
if (typeof globalThis.ResizeObserver === "undefined") {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  (globalThis as Record<string, unknown>).ResizeObserver = ResizeObserverStub;
}
```

- [ ] **Step 2: Update ResumePreview**

Replace the contents of `components/ResumePreview.tsx` with:

```tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { ResumeTemplate } from "@/lib/resume/renderResumeTemplate";
import { fitToOnePage } from "@/lib/resume/fitToOnePage";
import type { Profile } from "@/types/profile";

// The template box is 8.5in wide = 816 CSS px at 96dpi.
const TEMPLATE_W_PX = 8.5 * 96;

export function ResumePreview({
  resume,
  editable = false,
  onChange,
}: {
  resume: Profile;
  editable?: boolean;
  onChange?: (next: Profile) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // Scale the fixed-width template down to the container (phones), never up.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setScale(Math.min(1, el.clientWidth / TEMPLATE_W_PX));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const node = ref.current?.querySelector<HTMLElement>("#resume-print");
    if (!node) return;
    // While editing, render at natural scale so typing isn't zoomed; re-fit to a
    // single page once editing ends (and the print path re-fits before export).
    if (editable) {
      node.style.zoom = "1";
    } else {
      fitToOnePage(node);
    }
  }, [resume, editable]);

  return (
    <div
      ref={ref}
      className="overflow-hidden rounded-lg border border-[var(--color-outline)] bg-white"
    >
      {/* CSS zoom (unlike transform) affects layout, so the container height
          shrinks with the content and no dead whitespace is left behind. */}
      <div style={{ zoom: scale }}>
        <ResumeTemplate resume={resume} editable={editable} onChange={onChange} />
      </div>
    </div>
  );
}
```

Note: the template's own `max-w-full` would clamp it to the container before zoom applies; because zoom shrinks the box the template sees a wider layout viewport (`clientWidth / scale`), which equals its natural 816px — so the full page renders, scaled. Verify this in the browser in Step 4; if the template still wraps early, change the inner div to `style={{ zoom: scale, width: TEMPLATE_W_PX }}`.

- [ ] **Step 3: Run the full test suite**

Run: `npm run test`
Expected: PASS — no regressions (ResizeObserver stub prevents jsdom crashes).

- [ ] **Step 4: Visual verification**

`npm run dev`, DevTools device emulation at 390px width.
Expected: the whole resume page is visible, scaled down, no horizontal clipping. At desktop width it renders exactly as before (scale = 1).

- [ ] **Step 5: Commit**

```bash
git add components/ResumePreview.tsx vitest.setup.ts
git commit -m "feat: scale resume preview to fit mobile viewports"
```

---

### Task 4: Responsive shell (header, page layout, cards, buttons)

**Files:**
- Modify: `components/Header.tsx`
- Modify: `app/page.tsx`
- Modify: `components/ui/Card.tsx`
- Modify: `components/ui/Button.tsx`

- [ ] **Step 1: Header — tighter mobile padding, hide the badge on phones**

In `components/Header.tsx`:
- Change `"mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-6 py-4"` to `"mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4"`.
- Change the badge's `"inline-flex items-center gap-2 ..."` to `"hidden sm:inline-flex items-center gap-2 ..."` (keep the rest of the class string identical).

- [ ] **Step 2: Page container + hero typography**

In `app/page.tsx`:
- Change `"mx-auto max-w-[1440px] space-y-8 px-6 py-10"` to `"mx-auto max-w-[1440px] space-y-8 px-4 py-6 sm:px-6 sm:py-10"`.
- Change the hero `h2` classes `"mt-3 font-display text-4xl font-semibold leading-[1.08] tracking-[-0.02em] text-[var(--color-on-surface)] sm:text-5xl"` to `"mt-3 font-display text-3xl font-semibold leading-[1.08] tracking-[-0.02em] text-[var(--color-on-surface)] sm:text-4xl lg:text-5xl"`.

- [ ] **Step 3: Stack the Generate buttons on phones**

In `app/page.tsx`, the Generate row currently reads:

```tsx
<div className="flex flex-wrap gap-2">
  <Button variant="primary" onClick={generate} disabled={generating}>
```

Change the wrapper and buttons to:

```tsx
<div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
  <Button variant="primary" className="w-full sm:w-auto" onClick={generate} disabled={generating}>
    {generating ? "Generating…" : "Generate Resume"}
  </Button>
  <Button variant="secondary" className="w-full sm:w-auto" onClick={generateCoverLetter} disabled={generatingCover}>
    {generatingCover ? "Generating…" : "Generate Cover Letter"}
  </Button>
</div>
```

- [ ] **Step 4: Let the card headers wrap on phones**

In `app/page.tsx` there are two `"flex items-center justify-between"` headers (Generated Resume + ExportButtons, Cover Letter + CoverLetterExportButtons). Change both to:

```tsx
<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
```

- [ ] **Step 5: Card + Button touch ergonomics**

In `components/ui/Card.tsx`, change `p-6` to `p-4 sm:p-6` in the Card class string.
In `components/ui/Button.tsx`, change `"inline-flex items-center justify-center rounded-[var(--radius-md)] px-4 py-2.5 text-sm font-semibold ..."` to add `min-h-11` after `justify-center` (44px minimum touch target):
`"inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] px-4 py-2.5 text-sm font-semibold ..."`.

- [ ] **Step 6: Run tests + lint**

Run: `npm run test && npm run lint`
Expected: PASS / no new lint errors (Button.test.tsx must still pass — it doesn't assert exact class strings, but verify).

- [ ] **Step 7: Visual verification**

`npm run dev`, device emulation at 390px and 768px: header fits one line, hero readable, buttons full-width and ≥44px tall, cards have breathing room, no horizontal scrollbar anywhere.

- [ ] **Step 8: Commit**

```bash
git add components/Header.tsx app/page.tsx components/ui/Card.tsx components/ui/Button.tsx
git commit -m "feat: responsive mobile layout for header, hero, buttons, and cards"
```

---

### Task 5: Better keyword matching (aliases + plural folding)

`normalizeKeyword` is the single point all matching flows through (compare, score, coverage, prompt dedupe), so improving it improves match quality everywhere at once.

**Files:**
- Modify: `lib/matching/normalizeKeyword.ts`
- Test: `lib/matching/normalizeKeyword.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `lib/matching/normalizeKeyword.test.ts` (keep all existing tests):

```ts
describe("expanded aliases", () => {
  it.each([
    ["NextJS", "next.js"],
    ["Next JS", "next.js"],
    ["next js", "next.js"],
    ["VueJS", "vue.js"],
    ["Vue", "vue.js"],
    ["ExpressJS", "express.js"],
    ["Express", "express.js"],
    ["Golang", "go"],
    ["K8s", "kubernetes"],
    ["MSSQL", "sql server"],
    ["MS SQL", "sql server"],
    ["Amazon Web Services", "aws"],
    ["Google Cloud Platform", "gcp"],
    ["Google Cloud", "gcp"],
    ["TailwindCSS", "tailwind css"],
    ["Tailwind", "tailwind css"],
    ["unit tests", "unit testing"],
    ["unit test", "unit testing"],
  ])("normalizes %s -> %s", (input, expected) => {
    expect(normalizeKeyword(input)).toBe(expected);
  });
});

describe("plural folding", () => {
  it("folds simple plurals so 'databases' matches 'database'", () => {
    expect(normalizeKeyword("databases")).toBe(normalizeKeyword("database"));
  });
  it("folds 'microservices' to match 'microservice'", () => {
    expect(normalizeKeyword("microservices")).toBe(normalizeKeyword("microservice"));
  });
  it("does not fold short tokens like 'css'", () => {
    expect(normalizeKeyword("css")).toBe("css");
  });
  it("does not fold double-s endings like 'access'", () => {
    expect(normalizeKeyword("access")).toBe("access");
  });
  it("still maps plural aliases: 'REST APIs' -> 'rest apis'", () => {
    expect(normalizeKeyword("REST APIs")).toBe("rest apis");
  });
});
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npm run test -- lib/matching/normalizeKeyword.test.ts`
Expected: new tests FAIL, existing tests PASS.

- [ ] **Step 3: Implement**

Replace the contents of `lib/matching/normalizeKeyword.ts` with:

```ts
const ALIASES: Record<string, string> = {
  "reactjs": "react",
  "react.js": "react",
  "react js": "react",
  "nodejs": "node.js",
  "node js": "node.js",
  "node": "node.js",
  "nextjs": "next.js",
  "next js": "next.js",
  "vuejs": "vue.js",
  "vue js": "vue.js",
  "vue": "vue.js",
  "expressjs": "express.js",
  "express js": "express.js",
  "express": "express.js",
  "golang": "go",
  "k8s": "kubernetes",
  "postgres": "postgresql",
  "mssql": "sql server",
  "ms sql": "sql server",
  "ms sql server": "sql server",
  "amazon web services": "aws",
  "google cloud platform": "gcp",
  "google cloud": "gcp",
  "tailwindcss": "tailwind css",
  "tailwind": "tailwind css",
  "js": "javascript",
  "ts": "typescript",
  "rest": "rest apis",
  "rest api": "rest apis",
  "restful": "rest apis",
  "restful api": "rest apis",
  "restful apis": "rest apis",
  "unit test": "unit testing",
  "unit tests": "unit testing",
  "ci/cd": "cicd",
  "ci cd": "cicd",
};

// Fold a simple trailing-s plural. Words of 3 chars or fewer ("css", "aws")
// and double-s endings ("access") are left intact. Applied identically to job
// and profile keywords, so both sides land on the same form.
function stemPlural(s: string): string {
  if (s.length > 3 && s.endsWith("s") && !s.endsWith("ss")) return s.slice(0, -1);
  return s;
}

export function normalizeKeyword(input: string): string {
  let s = input.toLowerCase().trim().replace(/\s+/g, " ");
  // strip leading/trailing punctuation but keep internal dots/slashes
  s = s.replace(/^[^a-z0-9]+/, "").replace(/[^a-z0-9.+#]+$/, "");
  if (ALIASES[s]) return ALIASES[s];
  const stemmed = stemPlural(s);
  if (ALIASES[stemmed]) return ALIASES[stemmed];
  return stemmed;
}
```

- [ ] **Step 4: Run the FULL suite (not just this file)**

Run: `npm run test`
Expected: PASS everywhere. Matching, score, gap, and coverage tests all flow through `normalizeKeyword`; if any fixture asserted an exact normalized form that the plural fold now changes (e.g. expected `"databases"`), update that fixture's expected value to the folded form — the behavior change is intended.

- [ ] **Step 5: Commit**

```bash
git add lib/matching/normalizeKeyword.ts lib/matching/normalizeKeyword.test.ts
git commit -m "feat: expand keyword aliases and fold plurals for better matching"
```

---

### Task 6: Better job-post analysis (cleanup pass + sharper prompt)

Two changes: a deterministic post-parse cleanup (`cleanJobAnalysis`) that drops sentence-length "keywords" and cross-list duplicates, and a sharper extraction prompt.

**Files:**
- Create: `lib/matching/cleanJobAnalysis.ts`
- Test: `lib/matching/cleanJobAnalysis.test.ts`
- Modify: `app/api/analyze-job/route.ts`
- Modify: `lib/cloudflare/prompts.ts` (ANALYZE_JOB_SYSTEM)

- [ ] **Step 1: Write the failing test**

```ts
// lib/matching/cleanJobAnalysis.test.ts
import { describe, expect, it } from "vitest";
import { cleanJobAnalysis } from "./cleanJobAnalysis";
import type { JobAnalysis } from "@/types/job";

function base(overrides: Partial<JobAnalysis> = {}): JobAnalysis {
  return {
    jobTitle: "Software Engineer",
    companyName: "Acme",
    technologies: [],
    hardSkills: [],
    softSkills: [],
    responsibilities: [],
    preferredQualifications: [],
    atsKeywords: [],
    ...overrides,
  };
}

describe("cleanJobAnalysis", () => {
  it("removes cross-list duplicates with technologies taking precedence", () => {
    const out = cleanJobAnalysis(
      base({
        technologies: ["React", "TypeScript"],
        hardSkills: ["ReactJS", "SQL"],
        atsKeywords: ["react", "typescript", "SQL", "Agile"],
      }),
    );
    expect(out.technologies).toEqual(["React", "TypeScript"]);
    expect(out.hardSkills).toEqual(["SQL"]);
    expect(out.atsKeywords).toEqual(["Agile"]);
  });

  it("removes duplicates within a single list", () => {
    const out = cleanJobAnalysis(base({ technologies: ["React", "react.js"] }));
    expect(out.technologies).toEqual(["React"]);
  });

  it("drops sentence-length atsKeywords (more than 4 words)", () => {
    const out = cleanJobAnalysis(
      base({
        atsKeywords: [
          "REST APIs",
          "Collaborate with team members to design and ship features",
        ],
      }),
    );
    expect(out.atsKeywords).toEqual(["REST APIs"]);
  });

  it("leaves responsibilities and preferredQualifications untouched", () => {
    const resp = ["Build and maintain web applications end to end"];
    const out = cleanJobAnalysis(base({ responsibilities: resp }));
    expect(out.responsibilities).toEqual(resp);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- lib/matching/cleanJobAnalysis.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// lib/matching/cleanJobAnalysis.ts
import type { JobAnalysis } from "@/types/job";
import { normalizeKeyword } from "./normalizeKeyword";

const MAX_KEYWORD_WORDS = 4;

function dedupeInto(list: string[], seen: Set<string>): string[] {
  const out: string[] = [];
  for (const kw of list) {
    const trimmed = kw?.trim();
    if (!trimmed) continue;
    const norm = normalizeKeyword(trimmed);
    if (!norm || seen.has(norm)) continue;
    seen.add(norm);
    out.push(trimmed);
  }
  return out;
}

// Deterministic cleanup of the model's extraction: alias-aware dedupe within
// and across the scannable keyword lists (precedence: technologies > hardSkills
// > softSkills > atsKeywords), and drop atsKeywords that are sentence-length —
// the model occasionally pastes a responsibility line in there despite the
// prompt. Responsibilities and preferredQualifications are full sentences by
// design and pass through untouched.
export function cleanJobAnalysis(a: JobAnalysis): JobAnalysis {
  const seen = new Set<string>();
  const technologies = dedupeInto(a.technologies, seen);
  const hardSkills = dedupeInto(a.hardSkills, seen);
  const softSkills = dedupeInto(a.softSkills, seen);
  const atsKeywords = dedupeInto(a.atsKeywords, seen).filter(
    (kw) => kw.split(/\s+/).length <= MAX_KEYWORD_WORDS,
  );
  return { ...a, technologies, hardSkills, softSkills, atsKeywords };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- lib/matching/cleanJobAnalysis.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Apply it in the analyze-job route**

(Per AGENTS.md, skim `node_modules/next/dist/docs/` route-handler guide first.)

In `app/api/analyze-job/route.ts`:
- Add import: `import { cleanJobAnalysis } from "@/lib/matching/cleanJobAnalysis";`
- Change `const analysis = jobAnalysisSchema.parse(raw) as JobAnalysis;` to:

```ts
const analysis = cleanJobAnalysis(jobAnalysisSchema.parse(raw) as JobAnalysis);
```

- [ ] **Step 6: Sharpen the extraction prompt**

In `lib/cloudflare/prompts.ts`, replace `ANALYZE_JOB_SYSTEM` with:

```ts
export const ANALYZE_JOB_SYSTEM = `You extract structured job requirements from a job description.
Return ONLY valid JSON matching the provided schema. Do not explain.
Do not invent skills that are not present or clearly implied by the description.
Split items into: technologies (languages/frameworks/tools), hardSkills (technical abilities),
softSkills (interpersonal), responsibilities (duties), preferredQualifications (nice-to-haves),
and atsKeywords (the most important terms an ATS would scan for).

Rules:
- Each concrete skill appears in exactly ONE of technologies / hardSkills /
  softSkills / atsKeywords. Never repeat the same term across those lists.
- atsKeywords MUST be short, scannable noun phrases (1-4 words), e.g. "React",
  "REST APIs", "unit testing", "Agile". NEVER put a full sentence or a verbatim
  responsibility line in atsKeywords — distill it to the underlying skill/term
  instead (e.g. "Collaborate with team members to design features" ->
  "collaboration", "feature design").
- Prefer the job posting's own spelling for each term.
- Mark a skill required (technologies/hardSkills) only when the posting requires
  it; if it appears under "nice to have" / "preferred" / "bonus", put the full
  line in preferredQualifications and the distilled term in atsKeywords.
- Keep responsibilities as the full duty sentences.
- jobTitle is the exact posted title; companyName only if explicitly stated.`;
```

- [ ] **Step 7: Run the full suite**

Run: `npm run test`
Expected: PASS. `lib/cloudflare/prompts.test.ts` may assert on ANALYZE_JOB_SYSTEM phrasing — if it checks for substrings like "atsKeywords MUST be short", they still exist; fix any literal-match assertions to match the new text.

- [ ] **Step 8: Commit**

```bash
git add lib/matching/cleanJobAnalysis.ts lib/matching/cleanJobAnalysis.test.ts app/api/analyze-job/route.ts lib/cloudflare/prompts.ts
git commit -m "feat: dedupe and sanitize job analysis output; sharpen extraction prompt"
```

---

### Task 7: Better cover letters (stronger model, higher coverage bar, sharper prompt)

**Files:**
- Modify: `lib/cloudflare/callWorkersAI.ts`
- Modify: `app/api/generate-cover-letter/route.ts`
- Modify: `lib/cloudflare/prompts.ts` (COVER_LETTER_SYSTEM)

- [ ] **Step 1: Upgrade the default model**

In `lib/cloudflare/callWorkersAI.ts` change:

```ts
const DEFAULT_MODEL = "@cf/meta/llama-3.1-8b-instruct";
```

to:

```ts
// 70B writes dramatically better prose than 8B for the same JSON-mode API.
// Override with CLOUDFLARE_MODEL if this model is unavailable on the account.
const DEFAULT_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
```

The env override (`process.env.CLOUDFLARE_MODEL`) already exists, so if the account doesn't have this model, setting `CLOUDFLARE_MODEL=@cf/meta/llama-3.1-8b-instruct` restores the old behavior without a code change. Verify in Step 4 that a real request succeeds.

- [ ] **Step 2: Raise the coverage retry bar**

In `app/api/generate-cover-letter/route.ts` change:

```ts
const COVERAGE_TARGET = 70;
```

to:

```ts
const COVERAGE_TARGET = 80;
```

(The retry already keeps whichever draft scores higher, so raising the bar only ever improves the result; it costs at most the same single retry call.)

- [ ] **Step 3: Sharpen the letter prompt**

In `lib/cloudflare/prompts.ts`, inside `COVER_LETTER_SYSTEM`, make these two edits:

Edit A — replace the `2. opening` line:

```
2. opening — one short paragraph naming the target role and leading with the
   candidate's single strongest job-relevant qualification.
```

with:

```
2. opening — one short paragraph naming the target role (and the company by
   name when companyName is provided) and leading with the candidate's single
   strongest job-relevant qualification. Do not open with "I am writing to
   apply" — open with the qualification itself.
```

Edit B — after the COVERAGE paragraph, add a STYLE paragraph:

```
STYLE: Keep paragraphs to at most 4 sentences. Vary sentence length and
sentence openings — no two consecutive sentences may start with "I". Where the
candidate's profile contains a concrete number (users, requests, percentages,
team size), prefer citing it over a vague claim. Plain, confident, specific
prose; no exclamation marks.
```

- [ ] **Step 4: Run tests, then live verification**

Run: `npm run test`
Expected: PASS — fix any `prompts.test.ts` literal assertions affected by the edits (the test file checks prompt content; update expected substrings to the new text where needed).

Live check (requires `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` in `.env.local`): `npm run dev`, paste a real job posting, generate a cover letter. Expected: company named in the opening, no "I am writing to apply", coverage score ≥ previous typical scores. If Cloudflare returns a model-not-found error, set `CLOUDFLARE_MODEL` per Step 1 note and report the limitation.

- [ ] **Step 5: Commit**

```bash
git add lib/cloudflare/callWorkersAI.ts app/api/generate-cover-letter/route.ts lib/cloudflare/prompts.ts
git commit -m "feat: upgrade Workers AI model and sharpen cover-letter prompt"
```

---

### Task 8: Show responsibilities + preferred qualifications in the analysis panel

The model already extracts these; the UI never shows them. Collapsible sections keep mobile compact.

**Files:**
- Modify: `components/JobAnalysisPanel.tsx`

- [ ] **Step 1: Add collapsible sections**

In `components/JobAnalysisPanel.tsx`, after the two `<KeywordSection ... />` lines and before `<GapReviewPanel`, insert:

```tsx
      {analysis.responsibilities.length > 0 && (
        <details className="rounded-[var(--radius-md)] border border-[var(--color-outline)] p-3">
          <summary className="cursor-pointer text-sm font-semibold">
            Responsibilities ({analysis.responsibilities.length})
          </summary>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--color-on-surface-variant)]">
            {analysis.responsibilities.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </details>
      )}
      {analysis.preferredQualifications.length > 0 && (
        <details className="rounded-[var(--radius-md)] border border-[var(--color-outline)] p-3">
          <summary className="cursor-pointer text-sm font-semibold">
            Preferred Qualifications ({analysis.preferredQualifications.length})
          </summary>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--color-on-surface-variant)]">
            {analysis.preferredQualifications.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </details>
      )}
```

- [ ] **Step 2: Run tests + lint**

Run: `npm run test && npm run lint`
Expected: PASS / clean.

- [ ] **Step 3: Visual verification**

`npm run dev`, analyze a posting: both sections appear collapsed under the keyword chips, expand on tap, render fine at 390px width.

- [ ] **Step 4: Commit**

```bash
git add components/JobAnalysisPanel.tsx
git commit -m "feat: surface responsibilities and preferred qualifications in analysis panel"
```

---

## Final verification (after all tasks)

- [ ] `npm run test` — full suite green.
- [ ] `npm run lint` — clean.
- [ ] `npm run build` — compiles.
- [ ] `npm run pdf:check` — the puppeteer print-check still passes (print CSS untouched).
- [ ] Manual mobile pass (390px emulation): analyze → accept gaps → generate resume → Download PDF (downloads a one-page `resume.pdf`, NOT a screenshot of the page) → generate cover letter → Download PDF.
