// content/cv.json → cv/out/cv.html → public/Antonio-Giordano-CV.pdf
// Requires Playwright + Chromium (runs in GitHub Actions; locally: cd cv && npm ci && npx playwright install chromium && npm run pdf)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { chromium } from 'playwright';
import { renderCv } from './template.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const cv = JSON.parse(readFileSync(resolve(root, 'content/cv.json'), 'utf8'));
const OUT_PDF = resolve(root, 'public/Antonio-Giordano-CV.pdf');
const htmlPath = resolve(here, 'out/cv.html');

mkdirSync(dirname(htmlPath), { recursive: true });
writeFileSync(htmlPath, renderCv(cv, { fontsHref: '../fonts' }));

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
try {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' });
  const missing = await page.evaluate(async () => {
    await Promise.allSettled([...document.fonts].map(f => f.load()));
    return [...document.fonts].filter(f => f.status !== 'loaded').map(f => f.weight + ' ' + f.style);
  });
  if (missing.length) throw new Error('Font non caricati: ' + missing.join(', '));
  const pdf = await page.pdf({ format: 'A4', preferCSSPageSize: true, printBackground: true, tagged: true, outline: true });
  writeFileSync(OUT_PDF, pdf);
  console.log(`✔ CV → public/Antonio-Giordano-CV.pdf (${(pdf.length / 1024).toFixed(0)} KB)`);
} finally {
  await browser.close();
}
