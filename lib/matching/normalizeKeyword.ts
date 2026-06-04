const ALIASES: Record<string, string> = {
  "reactjs": "react",
  "react.js": "react",
  "react js": "react",
  "nodejs": "node.js",
  "node js": "node.js",
  "node": "node.js",
  "postgres": "postgresql",
  "js": "javascript",
  "ts": "typescript",
  "rest": "rest apis",
  "rest api": "rest apis",
  "restful": "rest apis",
  "restful api": "rest apis",
  "restful apis": "rest apis",
  "ci/cd": "cicd",
  "ci cd": "cicd",
};

export function normalizeKeyword(input: string): string {
  let s = input.toLowerCase().trim().replace(/\s+/g, " ");
  // strip leading/trailing punctuation but keep internal dots/slashes
  s = s.replace(/^[^a-z0-9]+/, "").replace(/[^a-z0-9.+#]+$/, "");
  if (ALIASES[s]) return ALIASES[s];
  return s;
}
