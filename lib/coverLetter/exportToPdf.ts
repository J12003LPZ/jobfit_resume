import type { CoverLetter } from "@/types/coverLetter";

export async function exportCoverLetterToPdf(letter: CoverLetter): Promise<void> {
  // Dynamic import keeps jsPDF out of the server bundle.
  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF({ unit: "in", format: "letter", orientation: "portrait" });

  const marginX = 1;        // 1 inch left/right margin
  const marginY = 1;        // 1 inch top margin
  const pageWidth = 8.5;
  const contentWidth = pageWidth - marginX * 2;   // 6.5 inches
  const fontSize = 11;
  const lineH = 0.2;        // line height in inches at 11pt
  const paraGap = 0.18;     // gap between paragraphs

  doc.setFont("times", "normal");
  doc.setFontSize(fontSize);

  let y = marginY;

  function writeLine(text: string) {
    doc.text(text, marginX, y);
    y += lineH;
  }

  function writeBlank() {
    y += lineH * 0.6;
  }

  function writeParagraph(text: string) {
    const lines = doc.splitTextToSize(text, contentWidth) as string[];
    doc.text(lines, marginX, y);
    y += lines.length * lineH + paraGap;
  }

  const c = letter.contact;

  // Header block
  writeLine(letter.candidateName);
  writeLine(c.location);
  if (c.phone) writeLine(c.phone);
  writeLine(c.email);
  writeLine(letter.date);

  // Blank space before recipient (matches reference)
  writeBlank();
  writeBlank();

  // Recipient + greeting
  writeLine(letter.recipient);
  writeBlank();
  writeLine(letter.greeting);
  writeBlank();

  // Prose
  writeParagraph(letter.opening);
  for (const para of letter.body) {
    writeParagraph(para);
  }
  writeParagraph(letter.closing);

  // Signature
  writeBlank();
  writeLine(`Sincerely, ${letter.candidateName}`);

  doc.save("cover-letter.pdf");
}
