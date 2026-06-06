import { CoverLetterTemplate } from "@/lib/coverLetter/renderCoverLetterTemplate";
import type { CoverLetter } from "@/types/coverLetter";

export function CoverLetterPreview({ letter }: { letter: CoverLetter }) {
  return (
    <div className="overflow-auto rounded-lg border border-[var(--color-outline)] bg-white">
      <CoverLetterTemplate letter={letter} />
    </div>
  );
}
