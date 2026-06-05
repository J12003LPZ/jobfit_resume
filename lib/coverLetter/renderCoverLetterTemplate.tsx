import type { CoverLetter } from "@/types/coverLetter";

export function CoverLetterTemplate({ letter }: { letter: CoverLetter }) {
  const c = letter.contact;

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
      <p style={{ margin: "0 0 2px 0" }}>{letter.candidateName}</p>
      <p style={{ margin: "0 0 2px 0" }}>{c.location}</p>
      {c.phone && <p style={{ margin: "0 0 2px 0" }}>{c.phone}</p>}
      <p style={{ margin: "0 0 2px 0" }}>
        <a href={`mailto:${c.email}`} style={{ color: "#000", textDecoration: "none" }}>
          {c.email}
        </a>
      </p>
      <p style={{ margin: "0 0 32px 0" }}>{letter.date}</p>

      {/* Recipient */}
      <p style={{ margin: "0 0 16px 0" }}>{letter.recipient}</p>

      {/* Greeting */}
      <p style={{ margin: "0 0 16px 0" }}>{letter.greeting}</p>

      {/* Opening */}
      <p style={{ margin: "0 0 16px 0", textAlign: "justify" }}>{letter.opening}</p>

      {/* Body paragraphs */}
      {letter.body.map((p, i) => (
        <p key={i} style={{ margin: "0 0 16px 0", textAlign: "justify" }}>{p}</p>
      ))}

      {/* Closing */}
      <p style={{ margin: "0 0 32px 0", textAlign: "justify" }}>{letter.closing}</p>

      {/* Signature */}
      <p style={{ margin: "0 0 0 0" }}>Sincerely,</p>
      <p style={{ margin: "4px 0 0 0" }}>{letter.candidateName}</p>
    </div>
  );
}
