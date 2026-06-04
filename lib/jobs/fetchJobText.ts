import { isHttpUrl } from "./isHttpUrl";
import { extractTextFromHtml } from "./extractTextFromHtml";

const MIN_TEXT_LENGTH = 20;
const FETCH_TIMEOUT_MS = 15_000;

export async function fetchJobText(
  rawUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const url = rawUrl.trim();
  if (!isHttpUrl(url)) {
    throw new Error("Please enter a valid http(s) job posting URL.");
  }

  const ac = new AbortController();
  const timeout = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetchImpl(url, {
      redirect: "follow",
      signal: ac.signal,
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; JobFitResume/1.0; +https://github.com/J12003LPZ/jobfit_resume)",
        accept: "text/html,application/xhtml+xml",
      },
    });
  } catch {
    throw new Error("Could not load that URL. Check the link and try again.");
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    throw new Error(
      `Could not load that URL (HTTP ${res.status}). Try pasting the description instead.`,
    );
  }

  const html = await res.text();
  const text = extractTextFromHtml(html);
  if (text.length < MIN_TEXT_LENGTH) {
    throw new Error(
      "That page didn't contain enough readable text. Paste the description instead.",
    );
  }
  return text;
}
