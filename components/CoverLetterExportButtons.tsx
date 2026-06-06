"use client";
import { Button } from "./ui/Button";
import { coverLetterToPlainText } from "@/lib/coverLetter/toPlainText";
import { exportCoverLetterToPdf } from "@/lib/coverLetter/exportToPdf";
import type { CoverLetter } from "@/types/coverLetter";

export function CoverLetterExportButtons({
  letter,
  onRegenerate,
  editing = false,
  onToggleEdit,
}: {
  letter: CoverLetter;
  onRegenerate: () => void;
  editing?: boolean;
  onToggleEdit?: () => void;
}) {
  async function copyText() {
    await navigator.clipboard.writeText(coverLetterToPlainText(letter));
  }

  async function downloadPdf() {
    await exportCoverLetterToPdf(letter);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" onClick={copyText}>Copy Text</Button>
      {onToggleEdit && (
        <Button variant="secondary" onClick={onToggleEdit}>
          {editing ? "Done" : "Edit"}
        </Button>
      )}
      <Button variant="secondary" onClick={downloadPdf}>Download PDF</Button>
      <Button variant="ghost" onClick={onRegenerate}>Regenerate</Button>
    </div>
  );
}
