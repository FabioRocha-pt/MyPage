// Interaction checks for template 06 on a running dev server.
// node interact.mjs <base>
import { chromium } from "@playwright/test";

const base = process.argv[2] ?? "http://127.0.0.1:3100";
const browser = await chromium.launch();
const results = [];
const check = (name, ok, extra = "") => results.push(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? "  · " + extra : ""}`);

// --- Desktop ---------------------------------------------------------------------
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${base}/p/ellputo`, { waitUntil: "networkidle" });

  // Section numbering in reading order.
  const labels = await page.$$eval(".t06 .vertical-label, .t06 .collaborations > .eyebrow", (els) =>
    els.map((el) => el.textContent.trim()).filter((t) => /^\d\d \//.test(t)),
  );
  check("labels numbered in order", labels.every((t, i) => t.startsWith(String(i + 1).padStart(2, "0"))), labels.join(" | "));

  // Nav only points at present sections.
  const navTargets = await page.$$eval("#navigation a", (as) => as.map((a) => a.getAttribute("href")));
  const missing = [];
  for (const href of navTargets) if (href.startsWith("#") && !(await page.$(href))) missing.push(href);
  check("nav targets exist", missing.length === 0, navTargets.join(" "));

  // Gallery dialog.
  await page.click('[data-gallery="0"]');
  const open = await page.$eval(".gallery-dialog", (d) => d.open);
  const cap1 = await page.textContent(".gallery-caption");
  await page.keyboard.press("ArrowRight");
  const cap2 = await page.textContent(".gallery-caption");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  const cap3 = await page.textContent(".gallery-caption");
  await page.keyboard.press("Escape");
  const closed = await page.$eval(".gallery-dialog", (d) => !d.open);
  const focusBack = await page.evaluate(() => document.activeElement?.getAttribute("data-gallery"));
  check("gallery opens, arrows cycle, Escape closes, focus returns", open && cap1.startsWith("1 / 10") && cap2.startsWith("2 / 10") && cap3.startsWith("10 / 10") && closed && focusBack === "0", `${cap1} → ${cap2} → ${cap3}`);

  // Video dialog.
  await page.click('.video-grid a[data-video="H8SfeAlMI3E"]');
  const iframe = await page.$eval(".video-player iframe", (f) => f.src).catch(() => null);
  const floatingHidden = await page.$eval(".floating-actions", (el) => getComputedStyle(el).visibility === "hidden");
  await page.click(".video-close");
  await page.waitForTimeout(200);
  const emptied = await page.$$eval(".video-player iframe", (f) => f.length === 0);
  check("YouTube dialog: nocookie iframe on click, removed on close", iframe?.startsWith("https://www.youtube-nocookie.com/embed/H8SfeAlMI3E") && emptied, iframe ?? "no iframe");
  check("floating buttons hidden while a dialog is open", floatingHidden);

  // Playlist card opens externally (no data-video).
  const playlist = await page.$$eval(".video-grid a", (as) => as.filter((a) => !a.dataset.video).map((a) => a.href));
  check("playlist card is an external link", playlist.length === 1 && playlist[0].includes("list="), playlist.join());

  // Carousel.
  await page.locator("#about").scrollIntoViewIfNeeded();
  await page.click('.portrait-carousel [data-slide="1"]');
  const idx = await page.textContent(".portrait-index");
  await page.click(".portrait-carousel .slide-pause");
  const pauseText = await page.textContent(".portrait-carousel .slide-pause");
  check("carousel next + manual pause", idx.trim() === "02 / 03" && pauseText === "Play", `${idx} · ${pauseText}`);

  // Global motion pause.
  await page.click(".motion-toggle");
  const paused = await page.$eval(".t06", (el) => el.classList.contains("motion-paused"));
  const btn = await page.textContent(".motion-toggle");
  check("motion toggle pauses the page", paused && btn === "Resume motion", btn);

  // Local film served in ranges.
  const src = await page.$eval(".story-film source", (s) => s.src);
  const res = await page.request.get(src, { headers: { Range: "bytes=0-1023" } });
  check("reel served with byte ranges", res.status() === 206 && res.headers()["content-range"]?.startsWith("bytes 0-1023/"), `${res.status()} ${res.headers()["content-range"]}`);
  const preload = await page.$$eval("video", (vs) => vs.map((v) => v.preload));
  check("videos preload=none, no autoplay", preload.every((p) => p === "none") && (await page.$$eval("video[autoplay]", (v) => v.length)) === 0, preload.join());

  check("no page errors (desktop)", errors.length === 0, errors.join(" | "));
  await page.close();
}

// --- Mobile ----------------------------------------------------------------------
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await page.goto(`${base}/p/ellputo`, { waitUntil: "networkidle" });
  await page.click("button.menu");
  const expanded = await page.getAttribute("button.menu", "aria-expanded");
  const navVisible = await page.isVisible("#navigation a[href='#music']");
  await page.click("#navigation a[href='#music']");
  const collapsed = await page.getAttribute("button.menu", "aria-expanded");
  check("mobile menu opens, link closes it", expanded === "true" && navVisible && collapsed === "false");
  await page.click("button.menu");
  await page.keyboard.press("Escape");
  const esc = await page.getAttribute("button.menu", "aria-expanded");
  const focused = await page.evaluate(() => document.activeElement?.classList.contains("menu"));
  check("Escape closes the menu and returns focus", esc === "false" && focused);
  for (const w of [320, 700, 1024]) {
    await page.setViewportSize({ width: w, height: 800 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(`no horizontal scroll at ${w}px`, overflow <= 0, String(overflow));
  }
  await page.close();
}

// --- Another artist: the catalogue demo (no Ellputo content) ---------------------
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const response = await page.goto(`${base}/templates/06`, { waitUntil: "networkidle" });
  const html = await page.content();
  check("demo renders", response.status() === 200, String(response.status()));
  check("no Ellputo content leaks into another artist", !/ellputo|geobek|mozambique/i.test(html));
  check("no page errors (demo)", errors.length === 0, errors.join(" | "));
  await page.close();
}

await browser.close();
console.log(results.join("\n"));
