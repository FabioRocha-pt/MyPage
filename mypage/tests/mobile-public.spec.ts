import { test, expect } from "@playwright/test";
import { clippedText, documentOverflow, edgeOverflow, report, smallTapTargets } from "./helpers/layout";

/**
 * Public screens on a phone.
 *
 * The routes below are everything a visitor can reach without an account, plus
 * the five full-size template previews, which are the only place the public
 * page stylesheet (`templates.css`) renders with content.
 */

const ROUTES = [
  { path: "/", name: "landing" },
  { path: "/login", name: "login" },
  { path: "/signup", name: "signup" },
  { path: "/artists", name: "artists" },
  { path: "/templates", name: "template catalogue" },
  { path: "/templates/01", name: "template 01" },
  { path: "/templates/02", name: "template 02" },
  { path: "/templates/03", name: "template 03" },
  { path: "/templates/04", name: "template 04" },
  { path: "/templates/05", name: "template 05" },
];

for (const route of ROUTES) {
  test.describe(route.name, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(route.path);
      // Thumbnails scale themselves through a ResizeObserver, and the landing
      // measures its own parallax on load; both settle within a frame or two.
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(250);
    });

    test("does not scroll sideways", async ({ page }) => {
      const result = await documentOverflow(page);
      expect(
        result.overflows,
        `${route.path} scrolls sideways: ${result.scrollWidth}px of content in ${result.clientWidth}px`,
      ).toBe(false);
    });

    test("keeps every element inside the viewport", async ({ page }) => {
      const offenders = await edgeOverflow(page);
      expect(offenders, report(`${route.path} has elements past the viewport edge`, offenders)).toEqual([]);
    });

    test("gives every control a 44px touch target", async ({ page }) => {
      const offenders = await smallTapTargets(page);
      expect(offenders, report(`${route.path} has controls under 44px`, offenders)).toEqual([]);
    });

    test("never cuts text off unreachably", async ({ page }) => {
      const offenders = await clippedText(page);
      expect(offenders, report(`${route.path} has clipped text`, offenders)).toEqual([]);
    });
  });
}

/**
 * The nav links used to be removed below 950px (`.lp-navlinks a:not(.keep)`)
 * and the Backoffice button below 620px. This is the regression guard: every
 * entry has to be present and reachable, scrolled into view if need be.
 */
test("landing keeps all navigation entries on a phone", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  for (const name of ["Artistas", "Templates", "Tools", "Pricing"]) {
    const link = page.locator(".lp-navlinks a", { hasText: name });
    await expect(link, `"${name}" desapareceu da navegação`).toHaveCount(1);
    await link.scrollIntoViewIfNeeded();
    await expect(link).toBeVisible();
    const box = await link.boundingBox();
    expect(box!.height, `"${name}" tem ${box!.height}px de altura`).toBeGreaterThanOrEqual(43.5);
  }

  const backoffice = page.locator(".lp-actions a", { hasText: "Backoffice" });
  await expect(backoffice, "o botão Backoffice foi escondido").toBeVisible();
});

/** `.ar-navlinks .optional` used to be dropped below 800px. */
test("artist directory keeps all navigation entries on a phone", async ({ page }) => {
  await page.goto("/artists");
  await expect(page.locator(".ar-navlinks a", { hasText: "Conhecer My Page" })).toBeVisible();
  await expect(page.locator(".ar-navlinks a", { hasText: "Artistas" })).toBeVisible();
  await expect(page.locator(".ar-navlinks a", { hasText: "O meu espaço" })).toBeVisible();
});

/** `.auth-aside` used to be dropped below 900px, taking the whole pitch. */
test("sign-in keeps the brand and the summary on a phone", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator(".auth-aside")).toBeVisible();
  await expect(page.locator(".auth-brand")).toBeVisible();
  await expect(page.locator(".auth-list li")).toHaveCount(3);
  for (const item of await page.locator(".auth-list li").all()) {
    await expect(item).toBeVisible();
  }
});

/**
 * `.tpl-nav ul` used to be dropped below 900px, and `.tpl-event-poster` with
 * it, so a published page lost both its section nav and its date thumbnails.
 */
test("template pages keep their section nav and event posters", async ({ page }) => {
  await page.goto("/templates/01");
  await page.waitForLoadState("networkidle");

  const sectionLinks = page.locator(".tpl-nav ul a");
  const count = await sectionLinks.count();
  expect(count, "o menu de secções do template está vazio").toBeGreaterThan(0);

  for (const link of await sectionLinks.all()) {
    await link.scrollIntoViewIfNeeded();
    await expect(link).toBeVisible();
  }

  const posters = page.locator(".tpl-event-poster");
  if ((await posters.count()) > 0) {
    await expect(posters.first()).toBeVisible();
  }
});
