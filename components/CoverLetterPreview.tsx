import { CoverLetterTemplate } from "@/lib/coverLetter/renderCoverLetterTemplate";
import type { CoverLetter } from "@/types/coverLetter";

export function CoverLetterPreview({
  letter,
  editable = false,
  onChange,
}: {
  letter: CoverLetter;
  editable?: boolean;
  onChange?: (next: CoverLetter) => void;
}) {
  return (
    <div className="overflow-auto rounded-lg border border-[var(--color-outline)] bg-white">
      <CoverLetterTemplate letter={letter} editable={editable} onChange={onChange} />
    </div>
  );
}
