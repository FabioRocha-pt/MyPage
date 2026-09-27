import { chromium } from "file:///E:/Projects/MyPage/mypage/node_modules/playwright/index.mjs";
const B = "http://localhost:3100";
const browser = await chromium.launch();
const page = await browser.newPage(); page.on("console", m => (m.type()==="error"||m.type()==="warning") && console.log("CONSOLE", m.text().slice(0,400))); page.on("response", r => r.status()>=400 && console.log("HTTP", r.status(), r.url())); page.on("pageerror", e => console.log("PAGEERR", e.message));
await page.request.post(B + "/api/auth/login", { data: { email: "deekay@exemplo.cv", password: "mypage123" } });
for (const h of ["visual", "highlights", ""]) {
  await page.goto(B + "/studio/page#" + h, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  console.log(h || "(none)", await page.locator("details[open] summary b").allTextContents());
}
await browser.close();
