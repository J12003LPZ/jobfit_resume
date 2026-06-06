import type { CoverLetter } from "@/types/coverLetter";

export function coverLetterToPlainText(l: CoverLetter): string {
  const c = l.contact;
  const contactLine = [c.location, c.phone, c.email].filter(Boolean).join(" | ");

  const lines: string[] = [];
  lines.push(l.candidateName);
  if (contactLine) lines.push(contactLine);
  lines.push("", l.date, "", l.recipient, "", l.greeting, "", l.opening);
  for (const p of l.body) lines.push("", p);
  lines.push("", l.closing, "", "Sincerely,", l.candidateName);
  return lines.join("\n");
}
