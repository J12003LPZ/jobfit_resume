import type { Profile } from "@/types/profile";

function Heading({ children }: { children: string }) {
  return (
    <h2 className="mt-4 border-b border-black/70 pb-0.5 text-[11pt] font-bold uppercase tracking-wide">
      {children}
    </h2>
  );
}

// Bare URLs (e.g. "linkedin.com/in/...") need a protocol to be clickable in a
// PDF viewer; emails need a mailto: scheme.
function toHref(kind: "email" | "url", value: string): string {
  if (kind === "email") return `mailto:${value}`;
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

export function ResumeTemplate({ resume }: { resume: Profile }) {
  const c = resume.contact;
  const contactLine = [c.location, c.phone].filter(Boolean).join(" | ");
  const links: { text: string; href: string }[] = [
    c.email ? { text: c.email, href: toHref("email", c.email) } : null,
    c.linkedin ? { text: c.linkedin, href: toHref("url", c.linkedin) } : null,
    c.portfolio ? { text: c.portfolio, href: toHref("url", c.portfolio) } : null,
    c.github ? { text: c.github, href: toHref("url", c.github) } : null,
  ].filter((l): l is { text: string; href: string } => l !== null);

  return (
    <div
      id="resume-print"
      className="mx-auto w-[8.5in] max-w-full bg-white p-[0.6in] font-serif text-[10.5pt] leading-snug text-black"
      style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
    >
      <h1 className="text-center text-[20pt] font-bold tracking-wide">
        {resume.name.toUpperCase()}
      </h1>
      <p className="text-center text-[10pt]">{contactLine}</p>
      {links.length > 0 && (
        <p className="text-center text-[10pt]">
          {links.map((l, i) => (
            <span key={i}>
              {i > 0 && <span className="text-black"> | </span>}
              <a href={l.href} className="text-blue-800 underline">
                {l.text}
              </a>
            </span>
          ))}
        </p>
      )}

      <Heading>PROFESSIONAL SUMMARY</Heading>
      <p className="mt-1 text-justify">{resume.summary}</p>

      <Heading>TECHNICAL SKILLS</Heading>
      <p className="mt-1">{resume.skills.join(" • ")}</p>

      <Heading>PROFESSIONAL EXPERIENCE</Heading>
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
          <Heading>PROJECTS</Heading>
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

      <Heading>EDUCATION</Heading>
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
