import { describe, it, expect, vi } from "vitest";
import { fetchJobText } from "./fetchJobText";

function htmlResponse(body: string) {
  return new Response(body, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

describe("fetchJobText", () => {
  it("fetches a URL and returns extracted text", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      htmlResponse("<h1>Backend Engineer</h1><p>Go and Postgres</p>"),
    );
    const text = await fetchJobText("https://jobs.example.com/1", fetchImpl);
    expect(text).toBe("Backend Engineer Go and Postgres");
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("rejects non-http URLs before fetching", async () => {
    const fetchImpl = vi.fn();
    await expect(fetchJobText("ftp://x", fetchImpl)).rejects.toThrow(/valid/i);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("throws a friendly error on non-OK responses", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response("nope", { status: 404 }));
    await expect(
      fetchJobText("https://jobs.example.com/missing", fetchImpl),
    ).rejects.toThrow(/could not load/i);
  });

  it("throws when the page has too little text", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(htmlResponse("<p>hi</p>"));
    await expect(
      fetchJobText("https://jobs.example.com/empty", fetchImpl),
    ).rejects.toThrow(/enough/i);
  });
});
