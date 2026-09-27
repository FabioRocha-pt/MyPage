import { chromium } from "file:///E:/Projects/MyPage/mypage/node_modules/playwright/index.mjs";
const B = "http://localhost:3100";
const browser = await chromium.launch();
const page = await browser.newPage();
page.on("pageerror", e => console.log("PAGEERR", e.message));
await page.request.post(B + "/api/auth/login", { data: { email: "deekay@exemplo.cv", password: "mypage123" } });
await page.goto(B + "/studio/page#highlights", { waitUntil: "load" });
for (const t of [500, 3000, 8000]) {
  await page.waitForTimeout(t);
  console.log(t, await page.evaluate(() => [...document.querySelectorAll("details.accordion")].map(d => (d.open ? "O:" : "") + d.querySelector("summary b")?.textContent).join(" | ")));
}
await browser.close();
