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
