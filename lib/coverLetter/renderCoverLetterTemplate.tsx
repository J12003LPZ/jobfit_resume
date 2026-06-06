import type { CoverLetter } from "@/types/coverLetter";
import { Editable } from "@/components/Editable";

export function CoverLetterTemplate({
  letter,
  editable = false,
  onChange,
}: {
  letter: CoverLetter;
  editable?: boolean;
  onChange?: (next: CoverLetter) => void;
}) {
  const c = letter.contact;
  const ed = editable && !!onChange;

  const set = (patch: Partial<CoverLetter>) => onChange?.({ ...letter, ...patch });
  const setContact = (patch: Partial<CoverLetter["contact"]>) =>
    set({ contact: { ...letter.contact, ...patch } });

  const para = { margin: "0 0 16px 0" } as const;

  return (
    <div
      id="coverletter-print"
      style={{
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: "11pt",
        lineHeight: "1.6",
        color: "#000",
        background: "#fff",
        width: "8.5in",
        maxWidth: "100%",
        margin: "0 auto",
        padding: "1in",
        boxSizing: "border-box",
      }}
    >
      {/* Header — stacked, left-aligned */}
      <Editable as="p" editing={ed} value={letter.candidateName} onCommit={(v) => set({ candidateName: v })} style={{ margin: "0 0 2px 0" }} />
      <Editable as="p" editing={ed} value={c.location} onCommit={(v) => setContact({ location: v })} style={{ margin: "0 0 2px 0" }} />
      {(c.phone || ed) && (
        <Editable as="p" editing={ed} value={c.phone ?? ""} onCommit={(v) => setContact({ phone: v })} style={{ margin: "0 0 2px 0" }} />
      )}
      <p style={{ margin: "0 0 2px 0" }}>
        {ed ? (
          <Editable editing={ed} value={c.email} onCommit={(v) => setContact({ email: v })} />
        ) : (
          <a href={`mailto:${c.email}`} style={{ color: "#000", textDecoration: "none" }}>
            {c.email}
          </a>
        )}
      </p>
      <Editable as="p" editing={ed} value={letter.date} onCommit={(v) => set({ date: v })} style={{ margin: "0 0 32px 0" }} />

      {/* Recipient */}
      <Editable as="p" editing={ed} value={letter.recipient} onCommit={(v) => set({ recipient: v })} style={para} />

      {/* Greeting */}
      <Editable as="p" editing={ed} value={letter.greeting} onCommit={(v) => set({ greeting: v })} style={para} />

      {/* Opening */}
      <Editable as="p" editing={ed} value={letter.opening} onCommit={(v) => set({ opening: v })} style={{ ...para, textAlign: "justify" }} />

      {/* Body paragraphs */}
      {letter.body.map((p, i) => (
        <div key={i} style={para}>
          <Editable
            as="p"
            editing={ed}
            value={p}
            onCommit={(v) => set({ body: letter.body.map((x, k) => (k === i ? v : x)) })}
            style={{ margin: 0, textAlign: "justify" }}
          />
          {ed && (
            <button
              type="button"
              onClick={() => set({ body: letter.body.filter((_, k) => k !== i) })}
              className="select-none rounded px-1 text-[9pt] text-red-600 hover:bg-red-50"
            >
              ✕ remove paragraph
            </button>
          )}
        </div>
      ))}
      {ed && (
        <button
          type="button"
          onClick={() => set({ body: [...letter.body, "New paragraph."] })}
          className="mb-4 select-none rounded px-1 text-[9pt] font-sans text-[var(--color-primary)] hover:underline"
        >
          + add paragraph
        </button>
      )}

      {/* Closing */}
      <Editable as="p" editing={ed} value={letter.closing} onCommit={(v) => set({ closing: v })} style={{ ...para, margin: "0 0 32px 0", textAlign: "justify" }} />

      {/* Signature */}
      <p style={{ margin: "0 0 0 0" }}>Sincerely,</p>
      <Editable as="p" editing={ed} value={letter.candidateName} onCommit={(v) => set({ candidateName: v })} style={{ margin: "4px 0 0 0" }} />
    </div>
  );
}
