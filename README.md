# JobFit Resume — AI-Powered ATS Resume Tailor

Paste a job description, review matched vs. missing keywords, click **Accept All Gaps**, and generate an ATS-friendly resume you can export to PDF (print) or copy as plain text.

## Stack
Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Zod · Cloudflare Workers AI (REST). Hosted on Vercel; AI runs on Cloudflare.

## Setup
1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in `CLOUDFLARE_API_TOKEN` (Workers AI Read+Edit) and `CLOUDFLARE_ACCOUNT_ID`.
3. `npm run dev` → http://localhost:3000

## Deploy (Vercel)
Set `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` (and optional `CLOUDFLARE_MODEL`) as Vercel environment variables, then deploy. No Cloudflare Worker or Wrangler needed — the Next.js route handlers call the Cloudflare REST API directly.

## Tests
`npm run test`
