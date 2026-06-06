import type { ContactInfo, Profile } from "@/types/profile";
import { Editable } from "@/components/Editable";

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

// Small inline controls shown only while editing.
function DeleteBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      contentEditable={false}
      className="ml-1 select-none rounded px-1 text-[8pt] leading-none text-red-600 hover:bg-red-50"
      aria-label="Delete"
    >
      ✕
    </button>
  );
}

function AddBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      contentEditable={false}
      className="mt-1 select-none rounded px-1 text-[8pt] font-sans text-[var(--color-primary)] hover:underline"
    >
      + {label}
    </button>
  );
}

export function ResumeTemplate({
  resume,
  editable = false,
  onChange,
}: {
  resume: Profile;
  editable?: boolean;
  onChange?: (next: Profile) => void;
}) {
  const c = resume.contact;
  const ed = editable && !!onChange;

  // Immutable updaters.
  const set = (patch: Partial<Profile>) => onChange?.({ ...resume, ...patch });
  const setContact = (patch: Partial<ContactInfo>) =>
    set({ contact: { ...resume.contact, ...patch } });
  const setExp = (i: number, patch: Partial<Profile["experience"][number]>) =>
    set({ experience: resume.experience.map((e, idx) => (idx === i ? { ...e, ...patch } : e)) });
  const setProj = (i: number, patch: Partial<Profile["projects"][number]>) =>
    set({ projects: resume.projects.map((p, idx) => (idx === i ? { ...p, ...patch } : p)) });
  const setEdu = (i: number, patch: Partial<Profile["education"][number]>) =>
    set({ education: resume.education.map((e, idx) => (idx === i ? { ...e, ...patch } : e)) });

  type LinkEntry = { text: string; href: string; key: keyof ContactInfo };
  const rawLinks: (LinkEntry | null)[] = [
    c.email ? { text: c.email, href: toHref("email", c.email), key: "email" } : null,
    c.linkedin ? { text: c.linkedin, href: toHref("url", c.linkedin), key: "linkedin" } : null,
    c.portfolio ? { text: c.portfolio, href: toHref("url", c.portfolio), key: "portfolio" } : null,
    c.github ? { text: c.github, href: toHref("url", c.github), key: "github" } : null,
  ];
  const links = rawLinks.filter((l): l is LinkEntry => l !== null);

  return (
    <div
      id="resume-print"
      className="mx-auto w-[8.5in] max-w-full bg-white p-[0.6in] font-serif text-[10.5pt] leading-snug text-black"
      style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
    >
      <Editable
        as="h1"
        editing={ed}
        value={resume.name}
        onCommit={(v) => set({ name: v })}
        className="block text-center text-[20pt] font-bold uppercase tracking-wide"
      />
      <p className="text-center text-[10pt]">
        <Editable
          editing={ed}
          value={c.location}
          onCommit={(v) => setContact({ location: v })}
        />
        {(c.phone || ed) && (
          <>
            <span> | </span>
            <Editable
              editing={ed}
              value={c.phone ?? ""}
              onCommit={(v) => setContact({ phone: v })}
            />
          </>
        )}
      </p>
      {links.length > 0 && (
        <p className="text-center text-[10pt]">
          {links.map((l, i) => (
            <span key={l.key}>
              {i > 0 && <span className="text-black"> | </span>}
              {ed ? (
                <Editable
                  editing={ed}
                  value={l.text}
                  onCommit={(v) => setContact({ [l.key]: v } as Partial<ContactInfo>)}
                  className="text-blue-800 underline"
                />
              ) : (
                <a href={l.href} className="text-blue-800 underline">
                  {l.text}
                </a>
              )}
            </span>
          ))}
        </p>
      )}

      <Heading>PROFESSIONAL SUMMARY</Heading>
      <Editable
        as="p"
        editing={ed}
        value={resume.summary}
        onCommit={(v) => set({ summary: v })}
        className="mt-1 block text-justify"
      />

      <Heading>TECHNICAL SKILLS</Heading>
      <Editable
        as="p"
        editing={ed}
        value={resume.skills.join(" • ")}
        onCommit={(v) =>
          set({ skills: v.split(/\s*•\s*/).map((s) => s.trim()).filter(Boolean) })
        }
        className="mt-1 block"
      />

      <Heading>PROFESSIONAL EXPERIENCE</Heading>
      {resume.experience.map((e, i) => (
        <div key={i} className="mt-2">
          <Editable as="div" editing={ed} value={e.company} onCommit={(v) => setExp(i, { company: v })} className="block font-bold" />
          {(e.location || ed) && (
            <Editable as="div" editing={ed} value={e.location ?? ""} onCommit={(v) => setExp(i, { location: v })} className="block" />
          )}
          <div className="flex justify-between">
            <Editable editing={ed} value={e.role} onCommit={(v) => setExp(i, { role: v })} className="italic" />
            <Editable editing={ed} value={e.dates} onCommit={(v) => setExp(i, { dates: v })} />
          </div>
          <ul className="mt-1 list-disc pl-5">
            {e.bullets.map((b, j) => (
              <li key={j}>
                <Editable
                  editing={ed}
                  value={b}
                  onCommit={(v) => setExp(i, { bullets: e.bullets.map((x, k) => (k === j ? v : x)) })}
                />
                {ed && <DeleteBtn onClick={() => setExp(i, { bullets: e.bullets.filter((_, k) => k !== j) })} />}
              </li>
            ))}
          </ul>
          {ed && <AddBtn label="bullet" onClick={() => setExp(i, { bullets: [...e.bullets, "New accomplishment"] })} />}
        </div>
      ))}

      {(resume.projects.length > 0 || ed) && (
        <>
          <Heading>PROJECTS</Heading>
          {resume.projects.map((p, i) => (
            <div key={i} className="mt-2">
              <div className="font-bold">
                <Editable editing={ed} value={p.name} onCommit={(v) => setProj(i, { name: v })} />
                {(p.technologies.length > 0 || ed) && (
                  <span className="font-normal italic">
                    {" — "}
                    <Editable
                      editing={ed}
                      value={p.technologies.join(", ")}
                      onCommit={(v) => setProj(i, { technologies: v.split(",").map((t) => t.trim()).filter(Boolean) })}
                    />
                  </span>
                )}
              </div>
              <ul className="mt-1 list-disc pl-5">
                {p.bullets.map((b, j) => (
                  <li key={j}>
                    <Editable
                      editing={ed}
                      value={b}
                      onCommit={(v) => setProj(i, { bullets: p.bullets.map((x, k) => (k === j ? v : x)) })}
                    />
                    {ed && <DeleteBtn onClick={() => setProj(i, { bullets: p.bullets.filter((_, k) => k !== j) })} />}
                  </li>
                ))}
              </ul>
              {ed && <AddBtn label="bullet" onClick={() => setProj(i, { bullets: [...p.bullets, "New detail"] })} />}
            </div>
          ))}
        </>
      )}

      <Heading>EDUCATION</Heading>
      {resume.education.map((edu, i) => (
        <div key={i} className="mt-2">
          <Editable as="div" editing={ed} value={edu.school} onCommit={(v) => setEdu(i, { school: v })} className="block font-bold" />
          {(edu.location || ed) && (
            <Editable as="div" editing={ed} value={edu.location ?? ""} onCommit={(v) => setEdu(i, { location: v })} className="block" />
          )}
          <div className="flex justify-between">
            <Editable editing={ed} value={edu.degree} onCommit={(v) => setEdu(i, { degree: v })} className="italic" />
            {(edu.dates || ed) && (
              <Editable editing={ed} value={edu.dates ?? ""} onCommit={(v) => setEdu(i, { dates: v })} />
            )}
          </div>
          {(edu.gpa || ed) && (
            <div>
              • GPA:{" "}
              <Editable editing={ed} value={edu.gpa ?? ""} onCommit={(v) => setEdu(i, { gpa: v })} />
            </div>
          )}
          {edu.honors && edu.honors.length > 0 && (
            <ul className="list-disc pl-5">
              {edu.honors.map((h, j) => (
                <li key={j}>
                  <Editable
                    editing={ed}
                    value={h}
                    onCommit={(v) => setEdu(i, { honors: edu.honors!.map((x, k) => (k === j ? v : x)) })}
                  />
                  {ed && <DeleteBtn onClick={() => setEdu(i, { honors: edu.honors!.filter((_, k) => k !== j) })} />}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
