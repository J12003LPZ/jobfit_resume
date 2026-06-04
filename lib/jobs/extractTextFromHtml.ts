const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

export function extractTextFromHtml(html: string): string {
  const withoutBlocks = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");

  const withoutTags = withoutBlocks.replace(/<[^>]+>/g, " ");

  const decoded = withoutTags
    .replace(/&#(\d+);/g, (_, n) => {
      const cp = Number(n);
      return cp > 31 && cp < 1114112 ? String.fromCodePoint(cp) : " ";
    })
    .replace(
      /&[a-z]+;|&#39;/gi,
      (m) => ENTITIES[m.toLowerCase()] ?? m,
    );

  return decoded.replace(/\s+/g, " ").trim();
}
