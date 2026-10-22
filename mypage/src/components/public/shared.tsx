"use client";

import Link from "next/link";
import { useEffect, useState, type RefObject } from "react";
import { footerLinks, LANGS, type Lang } from "@/lib/public-content";

/**
 * Pieces shared by the public pages (landing, services, sectors, account and
 * system screens), ported from the landing handoff's vanilla scripts.
 *
 * The handoff kept the language in localStorage under `mypage-language` and
 * the theme under `mypage-theme`; both keys are kept, so a visitor's choice
 * carries across every public page. Pages render in Portuguese on the server
 * and switch after hydration, as the handoff did after its scripts ran.
 */

const LANGUAGE_KEY = "mypage-language";

function isLang(value: unknown): value is Lang {
  return typeof value === "string" && (LANGS as readonly string[]).includes(value);
}

export function useLanguage(): [Lang, (next: Lang) => void] {
  const [lang, setLang] = useState<Lang>("pt");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LANGUAGE_KEY);
      if (isLang(stored)) setLang(stored);
    } catch {
      // Private browsing: stay in Portuguese.
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    // The rest of the app is Portuguese; leave <html> as the layout set it.
    return () => {
      document.documentElement.lang = "pt";
    };
  }, [lang]);

  function change(next: Lang) {
    setLang(next);
    try {
      localStorage.setItem(LANGUAGE_KEY, next);
    } catch {
      // The choice simply does not persist.
    }
  }

  return [lang, change];
}

export function LanguageSelect({
  lang,
  onChange,
  label,
  id,
}: {
  lang: Lang;
  onChange: (next: Lang) => void;
  label: string;
  id?: string;
}) {
  return (
    <select
      id={id}
      aria-label={label}
      value={lang}
      onChange={(event) => {
        if (isLang(event.target.value)) onChange(event.target.value);
      }}
    >
      <option value="pt">PT</option>
      <option value="en">EN</option>
      <option value="fr">FR</option>
    </select>
  );
}

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const update = () => setReduced(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

/**
 * Reveal on scroll (landing-services.js `observe`). The root gets
 * `motion-ready` only once the observer runs, so without JavaScript, or with
 * reduced motion, every block is simply visible.
 */
export function useReveal(root: RefObject<HTMLElement | null>, reduced: boolean) {
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const nodes = [...element.querySelectorAll<HTMLElement>(".reveal")];
    if (reduced || !("IntersectionObserver" in window)) {
      element.classList.remove("motion-ready");
      nodes.forEach((node) => node.classList.add("in-view"));
      return;
    }
    element.classList.add("motion-ready");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -20px 0px" },
    );
    nodes.forEach((node, i) => {
      node.style.setProperty("--delay", `${(i % 3) * 70}ms`);
      if (!node.classList.contains("in-view")) observer.observe(node);
    });
    return () => observer.disconnect();
  }, [root, reduced]);
}

/** The category labels drift against their titles while scrolling
 *  (landing-navigation.js `draw`). */
export function useTitleDrift(root: RefObject<HTMLElement | null>, reduced: boolean) {
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const groups = [...element.querySelectorAll<HTMLElement>(".title-lockup,.ecosystem-partners")];
    let pending = false;
    function draw() {
      pending = false;
      const h = innerHeight;
      groups.forEach((group) => {
        const r = group.getBoundingClientRect();
        const active = !reduced && !group.closest("dialog") && r.bottom > -100 && r.top < h + 100;
        const p = active ? Math.max(-1, Math.min(1, (h * 0.5 - (r.top + r.height * 0.5)) / h)) : 0;
        group.style.setProperty("--label-drift", `${(p * 34).toFixed(2)}px`);
        group.style.setProperty("--title-drift", `${(p * -12).toFixed(2)}px`);
      });
    }
    function queue() {
      if (!pending) {
        pending = true;
        requestAnimationFrame(draw);
      }
    }
    addEventListener("scroll", queue, { passive: true });
    addEventListener("resize", queue);
    draw();
    return () => {
      removeEventListener("scroll", queue);
      removeEventListener("resize", queue);
    };
  }, [root, reduced]);
}

/** Original service marks: shared 48 × 48 grid and 2-unit strokes
 *  (mypage-brand-icons.js). */
const MARKS: Record<string, string> = {
  presence: "M12 36V18L24 10L36 18V36M18 36V24H30V36M18 18H30",
  media:
    "M8 14C13 8 19 20 24 14S35 20 40 14M8 24C13 18 19 30 24 24S35 30 40 24M8 34C13 28 19 40 24 34S35 40 40 34",
  presskit: "M10 10H38V38H10ZM24 10V38M10 24H38",
  booking: "M24 8L39 24L24 40L9 24ZM24 16V25L30 29",
  events: "M10 14H38V38H10ZM17 8V19M31 8V19M10 23H38M18 30H22M27 30H31",
  smartlink: "M8 28L17 19C21 15 27 15 31 19M17 29C21 33 27 33 31 29L40 20M18 30L30 18",
  donations: "M24 38L10 24C1 14 15 5 24 16C33 5 47 14 38 24ZM24 24V31M20.5 27.5H27.5",
  store: "M10 17H38V38H10ZM17 17V14C17 4 31 4 31 14V17M17 28L24 21L31 28L24 35Z",
  learning: "M8 14L24 8L40 14L24 21ZM13 18V31L24 37L35 31V18M40 14V29",
  live: "M16 12H32V36H16ZM10 17C6 21 6 27 10 31M38 17C42 21 42 27 38 31M22 20L28 24L22 28Z",
};

export function ServiceIcon({ name }: { name: string }) {
  return (
    <svg
      className="service-symbol"
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={MARKS[name] ?? MARKS.presence} />
    </svg>
  );
}

/** mypage-footer.js: the information and account links under every footer. */
const FOOTER_ROUTES = ["/help", "/contact", "/terms", "/privacy", "/login", "/signup"];

export function UtilityLinks({ lang }: { lang: Lang }) {
  const labels = footerLinks[lang];
  const label =
    lang === "pt" ? "Informações e conta" : lang === "fr" ? "Informations et compte" : "Information and account";
  return (
    <nav className="utility-footer-links" aria-label={label}>
      {FOOTER_ROUTES.map((href, i) => (
        <Link key={href} href={href}>
          {labels[i]}
        </Link>
      ))}
    </nav>
  );
}

export function Wordmark({ width, height }: { width: number; height: number }) {
  // A static SVG from public/; next/image adds nothing for it.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/landing/mypage-wordmark.svg" width={width} height={height} alt="mypage" />;
}
