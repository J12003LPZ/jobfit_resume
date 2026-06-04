import { ResumeTemplate } from "@/lib/resume/renderResumeTemplate";
import type { Profile } from "@/types/profile";

export function ResumePreview({ resume }: { resume: Profile }) {
  return (
    <div className="overflow-auto rounded-lg border border-[var(--color-outline)] bg-white">
      <ResumeTemplate resume={resume} />
    </div>
  );
}
