import { Badge } from "./ui/Badge";

export function KeywordSection({
  title,
  keywords,
  tone,
}: {
  title: string;
  keywords: string[];
  tone: "matched" | "gap";
}) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      {keywords.length === 0 ? (
        <p className="text-sm text-[var(--color-on-surface-variant)]">None</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {keywords.map((k) => (
            <Badge key={k} tone={tone}>{k}</Badge>
          ))}
        </div>
      )}
    </div>
  );
}
