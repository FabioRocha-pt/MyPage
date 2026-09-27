import { chromium } from "file:///E:/Projects/MyPage/mypage/node_modules/playwright/index.mjs";
const browser = await chromium.launch();
const ctx = await browser.newContext();
const r = await ctx.request.post("http://localhost:3100/api/auth/login", { data: { email: "deekay@exemplo.cv", password: "mypage123" } });
console.log(r.status());
await ctx.storageState({ path: "state.json" });
await browser.close();
