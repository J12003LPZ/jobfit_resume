import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { callWorkersAI } from "./callWorkersAI";

describe("callWorkersAI", () => {
  beforeEach(() => {
    process.env.CLOUDFLARE_API_TOKEN = "test-token";
    process.env.CLOUDFLARE_ACCOUNT_ID = "acct-123";
    delete process.env.CLOUDFLARE_MODEL;
  });
  afterEach(() => vi.restoreAllMocks());

  it("posts to the correct URL with auth header and returns parsed JSON from result.response", async () => {
    const payload = { jobTitle: "Dev", technologies: ["React"] };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: { response: JSON.stringify(payload) }, success: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const out = await callWorkersAI({
      system: "sys",
      user: "job text",
      jsonSchema: { type: "object", properties: {} },
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      "https://api.cloudflare.com/client/v4/accounts/acct-123/ai/run/@cf/meta/llama-3.1-8b-instruct"
    );
    expect(init.headers.Authorization).toBe("Bearer test-token");
    expect(out).toEqual(payload);
  });

  it("accepts result.response that is already an object", async () => {
    const payload = { jobTitle: "Dev" };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: { response: payload }, success: true }),
    }));
    const out = await callWorkersAI({ system: "s", user: "u", jsonSchema: {} });
    expect(out).toEqual(payload);
  });

  it("throws when credentials are missing", async () => {
    delete process.env.CLOUDFLARE_API_TOKEN;
    await expect(callWorkersAI({ system: "s", user: "u", jsonSchema: {} })).rejects.toThrow(
      /not configured/i
    );
  });

  it("throws on non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => "unauthorized",
    }));
    await expect(callWorkersAI({ system: "s", user: "u", jsonSchema: {} })).rejects.toThrow(
      /401/
    );
  });
});
