import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { callWorkersAI } from "@/lib/cloudflare/callWorkersAI";
import { ANALYZE_JOB_SYSTEM, analyzeJobUser } from "@/lib/cloudflare/prompts";
import { jobAnalysisJsonSchema } from "@/lib/cloudflare/jsonSchemas";
import { jobAnalysisSchema } from "@/schemas/job-analysis.schema";
import { analyzeGaps } from "@/lib/matching/analyzeGaps";
import { fetchJobText } from "@/lib/jobs/fetchJobText";
import { profileKeywords } from "@/data/leonardo-profile";
import type { JobAnalysis } from "@/types/job";

export const maxDuration = 300;

export async function POST(request: Request) {
  let body: { jobDescription?: unknown; jobUrl?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  let jobDescription =
    typeof body.jobDescription === "string" ? body.jobDescription.trim() : "";
  const jobUrl = typeof body.jobUrl === "string" ? body.jobUrl.trim() : "";

  if (!jobDescription && jobUrl) {
    try {
      jobDescription = await fetchJobText(jobUrl);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not load that URL.";
      return NextResponse.json({ error: message }, { status: 422 });
    }
  }

  if (!jobDescription) {
    return NextResponse.json(
      { error: "Missing jobDescription or jobUrl" },
      { status: 400 },
    );
  }

  try {
    const raw = await callWorkersAI<unknown>({
      system: ANALYZE_JOB_SYSTEM,
      user: analyzeJobUser(jobDescription),
      jsonSchema: jobAnalysisJsonSchema,
    });
    const analysis = jobAnalysisSchema.parse(raw) as JobAnalysis;
    const gap = analyzeGaps(analysis, profileKeywords());
    return NextResponse.json({ analysis, gap });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: "The model returned an unexpected response. Please try again." },
        { status: 502 },
      );
    }
    const message = err instanceof Error ? err.message : "Analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
