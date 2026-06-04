// Headless PDF check: renders the resume print page, exports a PDF exactly like
// Chrome's "Download PDF", and asserts (1) it is a single page and (2) the
// LinkedIn/portfolio/email links survive as clickable URI annotations.
//
// Usage: node scripts/check-resume-pdf.mjs [baseUrl]
//   baseUrl defaults to http://localhost:3000 (start `npm run dev` first).

import puppeteer from "puppeteer";
import { PDFDocument, PDFName, PDFString, PDFHexString } from "pdf-lib";

const BASE = process.argv[2] || "http://localhost:3000";

const EXPECTED_LINKS = [
  "https://linkedin.com/in/leonardo-jeziel-lopez",
  "https://portfolio-leonardo-lopez.vercel.app/",
  "mailto:leonardojeziellopez@gmail.com",
];

function collectUris(pdfDoc) {
  const uris = [];
  for (const page of pdfDoc.getPages()) {
    const annots = page.node.Annots();
    if (!annots) continue;
    for (let i = 0; i < annots.size(); i++) {
      const annot = annots.lookup(i);
      const action = annot?.lookup?.(PDFName.of("A"));
      const uri = action?.lookup?.(PDFName.of("URI"));
      if (uri instanceof PDFString || uri instanceof PDFHexString) {
        uris.push(uri.decodeText());
      }
    }
  }
  return uris;
}

async function checkVariant(browser, label, url) {
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle0" });
  await page.waitForSelector("body[data-print-ready='1']", { timeout: 10000 });
  await page.waitForSelector("#resume-print");

  const pdfBytes = await page.pdf({
    printBackground: true,
    preferCSSPageSize: true,
  });
  await page.close();

  const doc = await PDFDocument.load(pdfBytes);
  const pageCount = doc.getPageCount();
  const uris = collectUris(doc);

  const errors = [];
  if (pageCount !== 1) errors.push(`expected 1 page, got ${pageCount}`);
  if (label === "default") {
    for (const link of EXPECTED_LINKS) {
      if (!uris.includes(link)) errors.push(`missing clickable link: ${link}`);
    }
  }

  const ok = errors.length === 0;
  console.log(
    `${ok ? "PASS" : "FAIL"} [${label}] pages=${pageCount} links=${uris.length}` +
      (errors.length ? `\n       ${errors.join("\n       ")}` : ""),
  );
  if (label === "default" && uris.length) {
    console.log(`       uris: ${uris.join(" , ")}`);
  }
  return ok;
}

const browser = await puppeteer.launch({ headless: "new" });
try {
  const a = await checkVariant(browser, "default", `${BASE}/print-check`);
  const b = await checkVariant(browser, "long", `${BASE}/print-check?variant=long`);
  if (!a || !b) process.exit(1);
  console.log("\nAll PDF checks passed.");
} finally {
  await browser.close();
}
