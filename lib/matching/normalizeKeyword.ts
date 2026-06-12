const ALIASES: Record<string, string> = {
  "reactjs": "react",
  "react.js": "react",
  "react js": "react",
  "nodejs": "node.js",
  "node js": "node.js",
  "node": "node.js",
  "nextjs": "next.js",
  "next js": "next.js",
  "vuejs": "vue.js",
  "vue js": "vue.js",
  "vue": "vue.js",
  "expressjs": "express.js",
  "express js": "express.js",
  "express": "express.js",
  "golang": "go",
  "k8s": "kubernetes",
  "postgres": "postgresql",
  "mssql": "sql server",
  "ms sql": "sql server",
  "ms sql server": "sql server",
  "amazon web services": "aws",
  "google cloud platform": "gcp",
  "google cloud": "gcp",
  "tailwindcss": "tailwind css",
  "tailwind": "tailwind css",
  "js": "javascript",
  "ts": "typescript",
  "rest": "rest apis",
  "rest api": "rest apis",
  "restful": "rest apis",
  "restful api": "rest apis",
  "restful apis": "rest apis",
  "unit test": "unit testing",
  "unit tests": "unit testing",
  "ci/cd": "cicd",
  "ci cd": "cicd",
};

// Alias targets are canonical by definition; ones ending in "s" (kubernetes,
// node.js, rest apis) must never be plural-folded or the spelled-out form
// would diverge from what the alias maps to.
const CANONICAL = new Set(Object.values(ALIASES));

// Fold a simple trailing-s plural. Words of 3 chars or fewer ("css", "aws")
// and double-s endings ("access") are left intact. Applied identically to job
// and profile keywords, so both sides land on the same form.
function stemPlural(s: string): string {
  if (s.length > 3 && s.endsWith("s") && !s.endsWith("ss")) return s.slice(0, -1);
  return s;
}

export function normalizeKeyword(input: string): string {
  let s = input.toLowerCase().trim().replace(/\s+/g, " ");
  // strip leading/trailing punctuation but keep internal dots/slashes
  s = s.replace(/^[^a-z0-9]+/, "").replace(/[^a-z0-9.+#]+$/, "");
  if (ALIASES[s]) return ALIASES[s];
  if (CANONICAL.has(s)) return s;
  const stemmed = stemPlural(s);
  if (ALIASES[stemmed]) return ALIASES[stemmed];
  return stemmed;
}
