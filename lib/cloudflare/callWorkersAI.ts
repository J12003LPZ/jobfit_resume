type CallArgs = {
  system: string;
  user: string;
  jsonSchema: unknown;
  maxTokens?: number;
};

// 70B writes dramatically better prose than 8B for the same JSON-mode API.
// Override with CLOUDFLARE_MODEL if this model is unavailable on the account.
const DEFAULT_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

export async function callWorkersAI<T = unknown>({
  system,
  user,
  jsonSchema,
  maxTokens = 2000,
}: CallArgs): Promise<T> {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!token || !accountId) {
    throw new Error("Cloudflare Workers AI is not configured (missing CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID).");
  }
  const model = process.env.CLOUDFLARE_MODEL || DEFAULT_MODEL;
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;

  const ac = new AbortController();
  const timeout = setTimeout(() => ac.abort(), 240_000);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        max_tokens: maxTokens,
        response_format: {
          type: "json_schema",
          json_schema: jsonSchema,
        },
      }),
      signal: ac.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Cloudflare ${res.status}: ${text || "no body"}`);
    }

    const data = await res.json();
    const response = data?.result?.response;
    if (response == null) {
      throw new Error("Cloudflare returned no result.response");
    }
    if (typeof response === "string") {
      return JSON.parse(response) as T;
    }
    return response as T;
  } finally {
    clearTimeout(timeout);
  }
}
