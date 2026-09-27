import { chromium } from "file:///E:/Projects/MyPage/mypage/node_modules/playwright/index.mjs";
const B = "http://localhost:3100";
const browser = await chromium.launch();
const page = await (await browser.newContext({ storageState: "state.json" })).newPage();
await page.addInitScript(() => {
  window.__log = [];
  document.addEventListener("toggle", (e) => window.__log.push(`${performance.now()|0} ${e.target.querySelector("summary b")?.textContent} ${e.target.open} ${e.newState ?? ""}`), true);
});
await page.goto(B + "/studio/page", { waitUntil: "networkidle" });
await page.locator("summary", { hasText: "Galeria" }).click();
await page.waitForTimeout(800);
console.log((await page.evaluate(() => window.__log)).join("\n"));
await browser.close();
