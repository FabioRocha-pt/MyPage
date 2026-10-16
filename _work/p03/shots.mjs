// Full-page screenshots of the app page and the handoff reference, side by side.
// node ../_work/p03/shots.mjs <url> <prefix> [widths...]
import { chromium } from "@playwright/test";

const [url, prefix, ...widths] = process.argv.slice(2);
const browser = await chromium.launch();
for (const width of (widths.length ? widths : ["1440", "390"]).map(Number)) {
  const page = await browser.newPage({ viewport: { width, height: width < 700 ? 844 : 900 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(url, { waitUntil: "networkidle", timeout: 120000 });
  // Scroll through so every "pending" piece is revealed, then back to the top.
  const height = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < height; y += 500) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(60);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1200);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  await page.screenshot({ path: `${prefix}-${width}.png`, fullPage: true });
  console.log(width, "overflow:", overflow, "height:", height, errors.length ? "errors: " + errors.join(" | ") : "");
  await page.close();
}
await browser.close();
