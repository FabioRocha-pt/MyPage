import { test, expect } from "@playwright/test";
import { statePath } from "./helpers/accounts";
import { clippedText, documentOverflow, edgeOverflow, report, smallTapTargets } from "./helpers/layout";

/**
 * Backoffice on a phone, signed in as the premium account so every tool screen
 * is reachable. The free and pro accounts are covered by the plan test at the
 * bottom, which is about the "Fora do plano" marking rather than layout.
 */

test.use({ storageState: statePath("premium") });

const SCREENS = [
  { path: "/studio", name: "dashboard" },
  { path: "/studio/page", name: "page editor" },
  { path: "/studio/audio", name: "audio" },
  { path: "/studio/video", name: "video" },
  { path: "/studio/events", name: "events" },
  { path: "/studio/booking", name: "booking" },
  { path: "/studio/donations", name: "donations" },
  { path: "/studio/store", name: "store" },
];

/** The seven entries doc 01 fixes for the My Page submenu, in order. */
const TOOLS = ["Page", "Áudio", "Vídeos", "Eventos", "Booking", "Donativos", "Merchandising"];

for (const screen of SCREENS) {
  test.describe(screen.name, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(screen.path);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(250);
    });

    test("does not scroll sideways", async ({ page }) => {
      const result = await documentOverflow(page);
      expect(
        result.overflows,
        `${screen.path} scrolls sideways: ${result.scrollWidth}px of content in ${result.clientWidth}px`,
      ).toBe(false);
    });

    test("keeps every element inside the viewport", async ({ page }) => {
      const offenders = await edgeOverflow(page);
      expect(offenders, report(`${screen.path} has elements past the viewport edge`, offenders)).toEqual([]);
    });

    test("gives every control a 44px touch target", async ({ page }) => {
      const offenders = await smallTapTargets(page);
      expect(offenders, report(`${screen.path} has controls under 44px`, offenders)).toEqual([]);
    });

    test("never cuts text off unreachably", async ({ page }) => {
      const offenders = await clippedText(page);
      expect(offenders, report(`${screen.path} has clipped text`, offenders)).toEqual([]);
    });
  });
}

/**
 * The regression this whole pass started from.
 *
 * `.sidebar nav` used to be `grid-auto-flow: column` below 720px, which turned
 * the submenu into a third grid column: all seven tool entries started at
 * x=357 on a 360px viewport, so five were off-screen and the two that showed
 * were cut in half. Every entry must now be reachable and correctly sized.
 */
test("every tool option is reachable in the mobile rail", async ({ page }) => {
  await page.goto("/studio/page");
  await page.waitForLoadState("networkidle");

  const rail = page.locator(".mypage-submenu");
  await expect(rail).toBeVisible();

  const links = rail.locator("a");
  await expect(links).toHaveCount(TOOLS.length);

  for (const [index, name] of TOOLS.entries()) {
    const link = links.nth(index);
    await expect(link, `"${name}" não está no menu`).toContainText(name);

    /*
     * Scrollable, therefore reachable. The rail is centre-snapped, so
     * `scrollIntoViewIfNeeded` can leave a chip half off: it aligns the
     * nearest edge and the snap engine then settles on whichever chip is
     * closest to centre. Driving `scrollLeft` to the chip's own snap position
     * is what a swipe would land on, and it is stable.
     */
    await rail.evaluate((node, offset) => {
      const chip = node.children[offset] as HTMLElement;
      node.scrollLeft = chip.offsetLeft - (node.clientWidth - chip.clientWidth) / 2;
    }, index);
    await page.waitForTimeout(50);

    const box = await link.boundingBox();
    const viewport = page.viewportSize()!;

    expect(box, `"${name}" não tem caixa`).not.toBeNull();
    expect(box!.height, `"${name}" tem ${box!.height}px de altura`).toBeGreaterThanOrEqual(43.5);
    expect(box!.x, `"${name}" começa fora do ecrã (x=${box!.x})`).toBeGreaterThanOrEqual(-1);
    expect(
      box!.x + box!.width,
      `"${name}" acaba fora do ecrã (x=${box!.x + box!.width}, viewport ${viewport.width})`,
    ).toBeLessThanOrEqual(viewport.width + 1);
  }
});

/** Each chip must actually navigate — a rail that scrolls but does not click. */
test("tool rail navigates to each screen", async ({ page }) => {
  await page.goto("/studio/page");
  await page.waitForLoadState("networkidle");

  for (const target of [
    { name: "Eventos", path: "/studio/events" },
    { name: "Merchandising", path: "/studio/store" },
    { name: "Page", path: "/studio/page" },
  ]) {
    const link = page.locator(".mypage-submenu a", { hasText: target.name }).first();
    await link.scrollIntoViewIfNeeded();
    await link.click();
    await expect(page).toHaveURL(new RegExp(`${target.path}$`));
  }
});

/**
 * The active chip can start out scrolled past the right edge — "Merchandising"
 * sits about 400px into the rail — so StudioNav centres it on arrival.
 */
test("the rail opens with the current screen in view", async ({ page }) => {
  await page.goto("/studio/store");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(200);

  const active = page.locator(".mypage-submenu a.active");
  await expect(active).toHaveText(/Merchandising/);

  const box = await active.boundingBox();
  const viewport = page.viewportSize()!;
  expect(box!.x, "o chip ativo abriu fora do ecrã à esquerda").toBeGreaterThanOrEqual(-1);
  expect(box!.x + box!.width, "o chip ativo abriu fora do ecrã à direita").toBeLessThanOrEqual(
    viewport.width + 1,
  );
});

/** Dashboard and My Page were listed twice: sidebar plus workspace tabs. */
test("Dashboard and My Page appear once each", async ({ page }) => {
  await page.goto("/studio/page");
  await page.waitForLoadState("networkidle");

  for (const name of ["Dashboard", "My Page"]) {
    const visible = await page
      .locator("nav a", { hasText: new RegExp(`^${name}$`) })
      .filter({ visible: true })
      .count();
    expect(visible, `"${name}" aparece ${visible} vezes na navegação`).toBe(1);
  }

  // The unique entry in the topbar stays.
  await expect(page.locator(".workspace-tabs .explore")).toBeVisible();
});

/** `.side-bottom` was hidden below 720px, dropping the environment line. */
test("the environment line survives on a phone", async ({ page }) => {
  await page.goto("/studio");
  await expect(page.locator(".side-bottom")).toBeVisible();
  await expect(page.locator(".side-bottom")).toContainText("Ambiente de desenvolvimento");
});

/** The month grid scrolls instead of dropping days or their notes. */
test("the booking calendar keeps all seven weekdays", async ({ page }) => {
  await page.goto("/studio/booking");
  await page.waitForLoadState("networkidle");

  const weekdays = page.locator(".calendar .weekday");
  await expect(weekdays).toHaveCount(7);
  for (const day of await weekdays.all()) {
    await day.scrollIntoViewIfNeeded();
    await expect(day).toBeVisible();
  }
});

/**
 * Out-of-plan tools stay listed and marked, as doc 04 asks. The free account
 * has neither press, donations nor store, so its rail must still show all seven
 * entries with notes on the ones it cannot use.
 */
test.describe("free plan", () => {
  test.use({ storageState: statePath("free") });

  test("marks tools outside the plan without removing them", async ({ page }) => {
    await page.goto("/studio/page");
    await page.waitForLoadState("networkidle");

    const links = page.locator(".mypage-submenu a");
    await expect(links).toHaveCount(TOOLS.length);

    const notes = page.locator(".mypage-submenu a small");
    expect(await notes.count(), "nenhuma ferramenta marcada como fora do plano").toBeGreaterThan(0);
    for (const note of await notes.all()) {
      await note.scrollIntoViewIfNeeded();
      await expect(note).toBeVisible();
      await expect(note).toHaveText("Fora do plano");
    }
  });

  test("keeps the layout intact at phone width", async ({ page }) => {
    await page.goto("/studio/page");
    await page.waitForLoadState("networkidle");
    const offenders = await edgeOverflow(page);
    expect(offenders, report("free plan editor has elements past the edge", offenders)).toEqual([]);
  });
});
