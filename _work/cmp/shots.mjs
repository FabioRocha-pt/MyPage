import { chromium } from "@playwright/test";
const b = await chromium.launch();
const out = "E:/Projects/MyPage/_work/shots/";
for (const [name, url, w, h] of [
  ["kevy-desktop", "/p/kevy", 1440, 900],
  ["kevy-booking-desktop", "/p/kevy/booking", 1440, 900],
  ["kevy-mobile", "/p/kevy", 390, 844],
]) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.emulateMedia({ reducedMotion: "reduce" });
  await p.goto("http://localhost:3100" + url, { waitUntil: "networkidle" });
  await p.waitForTimeout(800);
  await p.screenshot({ path: out + name + "-top.png" });
  await p.screenshot({ path: out + name + "-full.png", fullPage: true });
  await p.close();
}
await b.close();
