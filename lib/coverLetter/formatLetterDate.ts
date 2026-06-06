// Long US date for a letterhead, e.g. "June 5, 2026". Pinned to UTC so the
// string does not shift with the server/CI timezone.
export function formatLetterDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
