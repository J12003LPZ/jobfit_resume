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

  // 6. No fabrication: companies / schools / degrees must match the master verbatim
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
