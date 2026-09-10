import type { Page } from "@playwright/test";

/**
 * Layout probes shared by the mobile specs.
 *
 * Everything runs inside `page.evaluate` and returns plain data, so a failure
 * message names the offending selector instead of "expected true, got false".
 *
 * The exclusions below are deliberate, not convenience. Each one exists because
 * the pattern is correct on a phone and would otherwise be reported forever:
 *
 *   - Horizontal scrollers. A chip rail (the studio tool menu, the landing
 *     section links, the tools deck) is *meant* to have children past the right
 *     edge; that is what makes it scrollable. What matters is that the page
 *     itself does not scroll sideways, which `documentOverflow` checks.
 *   - Content clipped by an ancestor with `overflow: hidden`. The template
 *     thumbnails render a 1200px-wide iframe scaled down inside a cropped box;
 *     the iframe's transformed rect is wide but nothing spills on screen.
 *   - `aria-hidden` and `pointer-events: none` decoration. The landing's blurred
 *     glows are sized past the viewport on purpose.
 *   - Inline links inside a paragraph, for tap size only. WCAG 2.5.5 exempts
 *     targets in a sentence, where a 44px line box would break the prose.
 */

/** Reports whether the document itself can be scrolled sideways. */
export async function documentOverflow(page: Page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    return {
      scrollWidth: root.scrollWidth,
      clientWidth: root.clientWidth,
      overflows: root.scrollWidth > root.clientWidth + 1,
    };
  });
}

export interface Offender {
  selector: string;
  text: string;
  left: number;
  right: number;
  width: number;
  height: number;
}

const PROBE_HELPERS = `
  const describe = (el) => {
    const cls = typeof el.className === "string" && el.className.trim()
      ? "." + el.className.trim().split(/\\s+/).slice(0, 3).join(".")
      : "";
    const id = el.id ? "#" + el.id : "";
    return el.tagName.toLowerCase() + id + cls;
  };

  const label = (el) => (el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 40);

  const isVisible = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") return false;
    const box = el.getBoundingClientRect();
    return box.width > 0 && box.height > 0;
  };

  const isDecoration = (el) => {
    if (el.closest("[aria-hidden='true']")) return true;
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      if (getComputedStyle(n).pointerEvents === "none") return true;
    }
    return false;
  };

  // True when some ancestor scrolls horizontally, so being past the edge is by design.
  const inHorizontalScroller = (el) => {
    for (let n = el.parentElement; n && n !== document.documentElement; n = n.parentElement) {
      const overflowX = getComputedStyle(n).overflowX;
      if ((overflowX === "auto" || overflowX === "scroll") && n.scrollWidth > n.clientWidth + 1) return true;
    }
    return false;
  };

  // True when some ancestor crops the element, so the overflow is not visible.
  const isClipped = (el) => {
    for (let n = el.parentElement; n && n !== document.documentElement; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.overflowX === "hidden" || cs.overflowY === "hidden" || cs.overflow === "hidden") return true;
    }
    return false;
  };
`;

/**
 * Elements whose box crosses a viewport edge while genuinely being on screen —
 * the shape of bug where a button's right half is unreachable.
 */
export async function edgeOverflow(page: Page): Promise<Offender[]> {
  return page.evaluate(`(() => {
    ${PROBE_HELPERS}
    const vw = document.documentElement.clientWidth;
    const out = [];

    for (const el of document.querySelectorAll("body *")) {
      if (el.closest("nextjs-portal")) continue;
      if (!isVisible(el) || isDecoration(el)) continue;
      if (inHorizontalScroller(el) || isClipped(el)) continue;

      const box = el.getBoundingClientRect();
      if (box.right > vw + 1 || box.left < -1) {
        out.push({
          selector: describe(el),
          text: label(el),
          left: Math.round(box.left),
          right: Math.round(box.right),
          width: Math.round(box.width),
          height: Math.round(box.height),
        });
      }
    }
    return out;
  })()`) as Promise<Offender[]>;
}

/**
 * Standalone controls smaller than the minimum touch target.
 *
 * An input wrapped in a label is measured by the label: the whole pill is the
 * target, which is how the artist search field is built.
 */
export async function smallTapTargets(page: Page, minimum = 44): Promise<Offender[]> {
  return page.evaluate(
    `((minimum) => {
      ${PROBE_HELPERS}
      const out = [];
      const controls = "a[href], button, summary, select, input:not([type=hidden])";

      for (const el of document.querySelectorAll(controls)) {
        if (el.closest("nextjs-portal")) continue;
        if (!isVisible(el) || isDecoration(el)) continue;
        if (el.disabled || el.getAttribute("tabindex") === "-1") continue;
        // Inline links inside prose: exempt by WCAG 2.5.5.
        if (el.closest("p")) continue;

        const target = el.matches("input, select") ? (el.closest("label") ?? el) : el;
        const box = target.getBoundingClientRect();
        if (box.height < minimum - 0.5) {
          out.push({
            selector: describe(el),
            text: label(el),
            left: Math.round(box.left),
            right: Math.round(box.right),
            width: Math.round(box.width),
            height: Math.round(box.height),
          });
        }
      }
      return out;
    })(${minimum})`,
  ) as Promise<Offender[]>;
}

/**
 * Leaf text that is cut off with no ellipsis and no way to scroll to it —
 * i.e. words the reader simply cannot get to.
 *
 * The text is measured with a Range rather than by comparing `scrollWidth` to
 * `clientWidth`. `scrollWidth` counts absolutely positioned descendants, so the
 * decorative diamond on template 05's poster cells (`::after` at `right: -4px`)
 * made every one of them look like clipped copy. A Range measures the glyphs.
 */
export async function clippedText(page: Page): Promise<Offender[]> {
  return page.evaluate(`(() => {
    ${PROBE_HELPERS}
    const out = [];
    const range = document.createRange();

    for (const el of document.querySelectorAll("body *")) {
      if (el.closest("nextjs-portal")) continue;
      if (el.children.length > 0) continue;
      if (!isVisible(el) || isDecoration(el)) continue;
      if (!(el.textContent || "").trim()) continue;
      if (inHorizontalScroller(el)) continue;

      const cs = getComputedStyle(el);
      if (cs.overflowX === "auto" || cs.overflowX === "scroll") continue;
      // An ellipsis is a deliberate, visible truncation, not lost text.
      if (cs.textOverflow === "ellipsis") continue;

      range.selectNodeContents(el);
      const text = range.getBoundingClientRect();
      if (text.width === 0) continue;

      const box = el.getBoundingClientRect();
      const contentLeft = box.left + parseFloat(cs.borderLeftWidth) + parseFloat(cs.paddingLeft);
      const contentRight = box.right - parseFloat(cs.borderRightWidth) - parseFloat(cs.paddingRight);

      if (text.right > contentRight + 1 || text.left < contentLeft - 1) {
        out.push({
          selector: describe(el),
          text: label(el),
          left: Math.round(text.left),
          right: Math.round(text.right),
          width: Math.round(contentRight - contentLeft),
          height: Math.round(box.height),
        });
      }
    }
    return out;
  })()`) as Promise<Offender[]>;
}

/** Formats offenders into a failure message that points at the CSS to fix. */
export function report(title: string, offenders: Offender[]): string {
  return [
    `${title} (${offenders.length}):`,
    ...offenders.map(
      (o) =>
        `  ${o.selector} — ${o.width}×${o.height} at x=${o.left}..${o.right}` +
        (o.text ? ` — "${o.text}"` : ""),
    ),
  ].join("\n");
}
