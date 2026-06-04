import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";
import type { GapMode } from "@/types/resume";
import { normalizeKeyword } from "@/lib/matching/normalizeKeyword";

export function GapReviewPanel({
  gapKeywords,
  gapMode,
  acceptedKeywords,
  onAcceptAll,
  onVerifiedOnly,
  onCustomize,
  onToggleKeyword,
}: {
  gapKeywords: string[];
  gapMode: GapMode;
  acceptedKeywords: string[];
  onAcceptAll: () => void;
  onVerifiedOnly: () => void;
  onCustomize: () => void;
  onToggleKeyword: (kw: string) => void;
}) {
  const acceptedSet = new Set(acceptedKeywords.map(normalizeKeyword));
  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--color-on-surface-variant)]">
        We found {gapKeywords.length} keyword{gapKeywords.length === 1 ? "" : "s"} not currently in your profile.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={onAcceptAll}>Accept All Gaps</Button>
        <Button variant="secondary" onClick={onVerifiedOnly}>Use Only Verified Profile</Button>
        <Button variant="ghost" onClick={onCustomize}>Customize List</Button>
      </div>
      {gapMode === "custom" && (
        <div className="flex flex-wrap gap-2">
          {gapKeywords.map((k) => {
            const on = acceptedSet.has(normalizeKeyword(k));
            return (
              <button key={k} onClick={() => onToggleKeyword(k)} type="button">
                <Badge tone={on ? "matched" : "gap"}>{on ? "✓ " : "+ "}{k}</Badge>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
