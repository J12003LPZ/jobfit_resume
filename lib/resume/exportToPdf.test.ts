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
