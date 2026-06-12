import type { Profile } from "@/types/profile";
import type { jsPDF } from "jspdf";

const PAGE_W = 8.5;
const PAGE_H = 11;
const MARGIN = 0.6;
const CONTENT_W = PAGE_W - MARGIN * 2;
const LH = 1.25; // line-height factor, matches leading-snug closely enough

const PT_PER_IN = 72;
const FIT_SAFETY_MARGIN = 0.99; // damp by 1% to avoid oscillating at the page boundary
const HEADING_RULE_GAP = 0.035; // inches between baseline and rule (intentionally unscaled)
const HEADING_BOTTOM_PAD = 0.05; // inches after the rule (intentionally unscaled)
const BULLET_INDENT = 0.18;
const BULLET_DOT_OFFSET = 0.02;
const HEADING_PRE_SPACE = 1.5; // x line-height before a section heading
const ENTRY_PRE_SPACE = 0.4; // x line-height before each experience/project/education entry
const LINK_COLOR = [17, 85, 204] as const; // link blue

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
    scale *= (RESUME_PAGE_LIMIT / h) * FIT_SAFETY_MARGIN;
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
  const lh = (size: number) => (size * scale * LH) / PT_PER_IN;

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
    const lines = doc.splitTextToSize(text, CONTENT_W - BULLET_INDENT) as string[];
    lines.forEach((ln, i) => {
      y += lh(size);
      if (!dry) {
        if (i === 0) doc.text("•", MARGIN + BULLET_DOT_OFFSET, y);
        doc.text(ln, MARGIN + BULLET_INDENT, y);
      }
    });
  }

  function heading(text: string) {
    y += lh(11) * HEADING_PRE_SPACE;
    setFont(11, "bold");
    if (!dry) {
      doc.text(text.toUpperCase(), MARGIN, y);
      doc.setLineWidth(0.008);
      doc.line(MARGIN, y + HEADING_RULE_GAP, PAGE_W - MARGIN, y + HEADING_RULE_GAP);
    }
    y += HEADING_BOTTOM_PAD;
  }

  function row(left: string, right: string, size: number) {
    y += lh(size);
    setFont(size, "italic");
    if (!dry) {
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
          doc.setTextColor(LINK_COLOR[0], LINK_COLOR[1], LINK_COLOR[2]);
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
    y += lh(10.5) * ENTRY_PRE_SPACE;
    para(e.company, 10.5, "bold");
    if (e.location) para(e.location, 10.5);
    row(e.role, e.dates, 10.5);
    for (const b of e.bullets) bullet(b, 10.5);
  }

  if (resume.projects.length > 0) {
    heading("Projects");
    for (const p of resume.projects) {
      y += lh(10.5) * ENTRY_PRE_SPACE;
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
    y += lh(10.5) * ENTRY_PRE_SPACE;
    para(edu.school, 10.5, "bold");
    if (edu.location) para(edu.location, 10.5);
    row(edu.degree, edu.dates ?? "", 10.5);
    if (edu.gpa) bullet(`GPA: ${edu.gpa}`, 10.5);
    for (const h of edu.honors ?? []) bullet(h, 10.5);
  }

  return y;
}
