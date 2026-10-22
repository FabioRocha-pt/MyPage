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
  { path: "/servicos/presence", name: "service · presence" },
  { path: "/servicos/live", name: "service · live (coming soon)" },
  { path: "/setores/djs-produtores", name: "sector · djs & producers" },
  { path: "/help", name: "help" },
  { path: "/contact", name: "contact" },
  { path: "/terms", name: "terms" },
  { path: "/privacy", name: "privacy" },
  { path: "/esta-pagina-nao-existe", name: "404" },
  { path: "/login", name: "login" },
  { path: "/signup", name: "signup" },
  { path: "/artists", name: "artists" },
  { path: "/templates", name: "template catalogue" },
  { path: "/templates/01", name: "template 01" },
  { path: "/templates/02", name: "template 02" },
  { path: "/templates/03", name: "template 03" },
  { path: "/templates/04", name: "template 04" },
  { path: "/templates/05", name: "template 05" },
  // Template 02 · v1 with real content and its booking page. Needs `npm run db:seed:deekay`.
  { path: "/p/deekay", name: "published page · deekay" },
  { path: "/p/deekay/booking", name: "published booking page · deekay" },
  // Template 01 · v1 with real content and its booking page. Needs `npm run db:seed:kevy`.
  { path: "/p/kevy", name: "published page · kevy" },
  { path: "/p/kevy/booking", name: "published booking page · kevy" },
  // Página 3 · DJs & Producers (template 06). Needs `npm run db:seed:ellputo`.
  { path: "/p/ellputo", name: "published page · ellputo" },
  { path: "/templates/06", name: "template 06 demo" },
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
 * The landing's dock keeps only the wordmark and the menu button below 1060px;
 * everything else moves into the left menu. This is the regression guard:
 * every entry the desktop dock shows has to be reachable from the menu.
 */
test("landing keeps all navigation entries on a phone", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const trigger = page.locator(".menu-trigger");
  await expect(trigger).toBeVisible();
  await trigger.click();
  const menu = page.locator("#leftNavigation");
  await expect(menu).toBeVisible();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");

  for (const name of ["Serviços", "Para quem", "Artistas", "Entrar", "Começar"]) {
    const link = menu.locator("a", { hasText: name });
    await expect(link, `"${name}" desapareceu do menu`).toHaveCount(1);
    await link.scrollIntoViewIfNeeded();
    await expect(link).toBeVisible();
  }
  await expect(menu.locator("select")).toBeVisible();

  await menu.locator("a", { hasText: "Serviços" }).click();
  await expect(menu).toBeHidden();
});

/** `.ar-navlinks .optional` used to be dropped below 800px. */
test("artist directory keeps all navigation entries on a phone", async ({ page }) => {
  await page.goto("/artists");
  await expect(page.locator(".ar-navlinks a", { hasText: "Conhecer My Page" })).toBeVisible();
  await expect(page.locator(".ar-navlinks a", { hasText: "Artistas" })).toBeVisible();
  await expect(page.locator(".ar-navlinks a", { hasText: "O meu espaço" })).toBeVisible();
});

/** The login card keeps the way back, the language switch and the way to sign up. */
test("sign-in keeps its header and links on a phone", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator(".system-header .wordmark")).toBeVisible();
  await expect(page.locator(".system-header select")).toBeVisible();
  await expect(page.locator(".account-card h1")).toBeVisible();
  await expect(page.locator(".account-switch a", { hasText: "Criar conta" })).toBeVisible();
});

/**
 * `.tpl-nav ul` used to be dropped below 900px, and `.tpl-event-poster` with
 * it, so a published page lost both its section nav and its date thumbnails.
 * Templates 01 and 02 have their own renderers now; 03 still uses the shared one.
 */
test("template pages keep their section nav and event posters", async ({ page }) => {
  await page.goto("/templates/03");
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

/**
 * Template 01 · v1 moves the bar's section links into a panel of its own
 * below 850px ("painel próprio, por baixo da barra"). Every link has to be
 * reachable from it, and following one closes the panel.
 */
test("template 01 menu panel lists every section and closes on a link", async ({ page }) => {
  await page.goto("/p/kevy");
  await page.waitForLoadState("networkidle");

  const button = page.locator(".t01 .nav .menu");
  await expect(button).toBeVisible();
  const expected = await page.locator(".t01 .nav .links a").count();
  expect(expected, "a barra não tem secções").toBeGreaterThan(0);

  await button.click();
  const panel = page.locator(".t01 .mp-menu-painel");
  await expect(panel).toBeVisible();
  await expect(button).toHaveAttribute("aria-expanded", "true");
  await expect(panel.locator("a")).toHaveCount(expected);

  await panel.locator("a").first().click();
  await expect(panel).toBeHidden();
  await expect(button).toHaveAttribute("aria-expanded", "false");
});
