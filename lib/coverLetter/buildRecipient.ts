// The recipient line on the letter. We never invent a hiring manager's name,
// so we address the team and append the company only when we actually know it.
export function buildRecipient(companyName?: string): string {
  const name = (companyName ?? "").trim();
  return name ? `Hiring Team, ${name}` : "Hiring Team";
}
