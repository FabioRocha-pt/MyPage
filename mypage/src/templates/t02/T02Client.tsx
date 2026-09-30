"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Ext } from "../handoff/common";

/**
 * Template 02 · versão 1 — the interactive half. Template 01 · versão 1 (the
 * Kevy handoff) runs on the same engine, so it uses these components too, with
 * its own selector lists (`T01_MOTION`) and the menu panel outside the bar.
 *
 * Ported from the handoff's two scripts: the renderer's pop up ("pop up de
 * fotografias e vídeos", with descarregar/partilhar) and the motion file
 * ("movimento da página de artista"). The rules they state are kept:
 *   - "Sem JavaScript, ou com reduzir movimento ligado no sistema, a página
 *     aparece toda parada e completa. Nada aqui esconde conteúdo de forma
 *     permanente." Every hidden state below depends on `mp-mov`, which is only
 *     set here, after hydration, and never under prefers-reduced-motion.
 *   - "Nenhuma ligação tira a pessoa da página." YouTube opens in the pop up;
 *     every other external link is rendered with target=_blank on the server.
 *
 * One deliberate difference: the handoff rewrote the DOM (split titles into
 * words, refilled the genre ticker, swapped chapter text). Here that output is
 * produced by React, and this file only toggles classes and CSS variables, so a
 * router refresh can never find nodes React did not create.
 */

export interface MotionSelectors {
  groups: string;
  masks: string;
  titles: string;
}

const T02_MOTION: MotionSelectors = {
  groups:
    ".mp-galeria, .video-grid, .mp-faixas, .mp-palmares-grelha, .mp-numeros, .mp-grelha, .mp-rider-lista, .mp-notas, .mp-descargas, .assets, .mp-sociais, .footer-links",
  masks: ".mp-foto, .video-frame, .mp-esquema",
  titles: ".head h2, .booking h2, .press-copy h2",
};

/** From the Kevy handoff's motion file: the same engine, more of the page animates. */
export const T01_MOTION: MotionSelectors = {
  groups:
    ".mp-galeria, .video-grid, .mp-videos-01, .mp-faixas, .mp-palmares-grelha, .mp-numeros, .mp-grelha, .mp-rider-lista, .mp-notas, .mp-descargas, .mp-press-01, .assets, .mp-sociais, .hero-social, .events, .footer-links",
  masks: ".mp-foto, .video-frame, .mp-esquema, .mp-artwork",
  titles: ".head h2, .section-head h2, .booking h2, .press-copy h2",
};

function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function pageRoot(node: Element | null): HTMLElement | null {
  return (node?.closest(".t01, .t02") as HTMLElement | null) ?? null;
}

// --- Motion ------------------------------------------------------------------

export function T02Motion({ selectors = T02_MOTION }: { selectors?: MotionSelectors }) {
  const { groups: STAGGER_GROUPS, masks: MASKS, titles: TITLES } = selectors;
  const anchor = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = pageRoot(anchor.current);
    if (!root) return;
    const cleanups: Array<() => void> = [];
    const on = <K extends keyof WindowEventMap>(
      type: K,
      fn: (e: WindowEventMap[K]) => void,
      opts?: AddEventListenerOptions,
    ) => {
      window.addEventListener(type, fn, opts);
      cleanups.push(() => window.removeEventListener(type, fn));
    };

    // Genre ticker: the duration follows the width so the speed is constant.
    const tune = () => {
      root.querySelectorAll<HTMLElement>(".ticker .track").forEach((track) => {
        const first = track.firstElementChild as HTMLElement | null;
        if (first) track.style.setProperty("--mp-faixa-duracao", `${Math.max(18, first.scrollWidth / 70).toFixed(1)}s`);
      });
    };
    tune();
    let resizeTimer = 0;
    on("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(tune, 180);
    });

    // "Sem rede para o YouTube a miniatura falha: fica um fundo na cor do
    // artista com o botão de play." Runs with or without motion.
    root.querySelectorAll<HTMLImageElement>('.mp-foto[data-mp-lightbox="video"] img').forEach((img) => {
      const failed = () => img.closest(".mp-foto")?.classList.add("mp-sem-miniatura");
      if (img.complete && img.getAttribute("src") && !img.naturalWidth) failed();
      else {
        img.addEventListener("error", failed, { once: true });
        cleanups.push(() => img.removeEventListener("error", failed));
      }
    });

    if (reducedMotion() || !("IntersectionObserver" in window)) {
      root.classList.add("mp-parado");
      return () => {
        cleanups.forEach((fn) => fn());
        root.classList.remove("mp-parado");
      };
    }

    root.classList.add("mp-mov");
    const masksByParent = new Map<Element, HTMLElement[]>();
    const timers: number[] = [];

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const target = entry.target as HTMLElement;
          target.classList.add("mp-visivel");
          observer.unobserve(target);
          // Once the entrance has run, the element goes back to its own hover rules.
          if (target.hasAttribute("data-mp-grupo")) {
            const n = Math.min(target.children.length, 13);
            timers.push(window.setTimeout(() => target.removeAttribute("data-mp-grupo"), 1300 + n * 90));
          }
          for (const mask of masksByParent.get(target) ?? []) {
            mask.classList.add("mp-visivel");
            const i = parseFloat(getComputedStyle(mask).getPropertyValue("--i")) || 0;
            timers.push(window.setTimeout(() => mask.classList.remove("mp-mascara"), 1900 + i * 90));
          }
        }
      },
      { threshold: 0.14, rootMargin: "0px 0px -6% 0px" },
    );

    root.querySelectorAll(TITLES).forEach((title) => observer.observe(title));
    root.querySelectorAll<HTMLElement>(STAGGER_GROUPS).forEach((group) => {
      group.setAttribute("data-mp-grupo", "");
      Array.from(group.children).forEach((child, i) =>
        (child as HTMLElement).style.setProperty("--i", String(Math.min(i, 12))),
      );
      observer.observe(group);
    });
    root.querySelectorAll<HTMLElement>(MASKS).forEach((mask) => {
      mask.classList.add("mp-mascara");
      // A closed clip-path has no visible area, so the observer watches the parent.
      const parent = mask.parentElement;
      if (!parent) return;
      if (!masksByParent.has(parent)) masksByParent.set(parent, []);
      masksByParent.get(parent)!.push(mask);
      observer.observe(parent);
    });
    root.querySelectorAll(".label, .mp-palmares-fundo").forEach((node) => observer.observe(node));
    // Template 01's own entrance: `.reveal` blocks fade up once, then stay.
    const reveal = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("visible");
          reveal.unobserve(entry.target);
        }
      },
      { threshold: 0.13 },
    );
    root.querySelectorAll(".reveal").forEach((node) => reveal.observe(node));
    cleanups.push(() => reveal.disconnect());

    // Parallax and the shrinking bar.
    const parallax = Array.from(root.querySelectorAll<HTMLElement>("[data-mp-paralaxe]"));
    let frame = 0;
    const onScroll = () => {
      frame = 0;
      const vh = window.innerHeight;
      for (const node of parallax) {
        const box = (node.closest("section, .hero") ?? node.parentElement)!.getBoundingClientRect();
        if (box.bottom < -200 || box.top > vh + 200) continue;
        const factor = parseFloat(node.dataset.mpParalaxe ?? "") || 0.12;
        const centre = box.top + box.height / 2 - vh / 2;
        node.style.transform = `translate3d(0,${(-centre * factor).toFixed(1)}px,0)`;
      }
      root.classList.toggle("mp-rolou", window.scrollY > 40);
    };
    const requestScroll = () => {
      if (!frame) frame = requestAnimationFrame(onScroll);
    };
    on("scroll", requestScroll, { passive: true });
    on("resize", requestScroll);
    onScroll();

    // Light on the grid that follows the cursor, and magnetic buttons.
    if (!window.matchMedia("(hover: none)").matches) {
      let px = 0;
      let py = 0;
      let pending = 0;
      on(
        "pointermove",
        (e) => {
          px = e.clientX;
          py = e.clientY;
          if (pending) return;
          pending = requestAnimationFrame(() => {
            pending = 0;
            root.style.setProperty("--mp-mx", `${px}px`);
            root.style.setProperty("--mp-my", `${py}px`);
            root.classList.add("mp-luz");
          });
        },
        { passive: true },
      );
      const leave = () => root.classList.remove("mp-luz");
      document.addEventListener("pointerleave", leave);
      cleanups.push(() => document.removeEventListener("pointerleave", leave));

      root.querySelectorAll<HTMLElement>(".mp-vinil, .mp-social").forEach((button) => {
        const move = (e: PointerEvent) => {
          const r = button.getBoundingClientRect();
          button.style.setProperty("--mp-ix", `${(((e.clientX - r.left - r.width / 2) / r.width) * 10).toFixed(1)}px`);
          button.style.setProperty("--mp-iy", `${(((e.clientY - r.top - r.height / 2) / r.height) * 10).toFixed(1)}px`);
        };
        const reset = () => {
          button.style.removeProperty("--mp-ix");
          button.style.removeProperty("--mp-iy");
        };
        button.addEventListener("pointermove", move);
        button.addEventListener("pointerleave", reset);
        cleanups.push(() => {
          button.removeEventListener("pointermove", move);
          button.removeEventListener("pointerleave", reset);
        });
      });
    }

    // Hero entrance, two frames later so the initial state is painted first.
    const entrance = requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add("mp-entrou")));

    return () => {
      cleanups.forEach((fn) => fn());
      timers.forEach(clearTimeout);
      cancelAnimationFrame(entrance);
      if (frame) cancelAnimationFrame(frame);
      observer.disconnect();
      root.classList.remove("mp-mov", "mp-entrou", "mp-rolou", "mp-luz");
    };
  }, [STAGGER_GROUPS, MASKS, TITLES]);

  return (
    <>
      <span ref={anchor} hidden />
      <T02Lightbox />
    </>
  );
}

// --- Mobile menu -------------------------------------------------------------

/**
 * Template 01 opens a panel of its own below the bar (the Kevy handoff's
 * "painel próprio"): a fixed element inside a glass bar would be sized by the
 * bar. Template 02 unfolds its `.nav-links` in place.
 */
export function T02MenuButton({ panel }: { panel?: Array<{ href: string; label: string }> }) {
  const button = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [host, setHost] = useState<HTMLElement | null>(null);

  // The panel is portalled to the page root, outside the bar.
  useEffect(() => {
    if (panel) setHost(pageRoot(button.current));
  }, [panel]);

  useEffect(() => {
    const root = pageRoot(button.current);
    if (!root) return;
    root.classList.toggle("mp-menu-aberto", open);
    document.body.style.overflow = open ? "hidden" : "";
    if (!open) return;

    const links = root.querySelector(panel ? ".mp-menu-painel" : ".nav-links");
    const close = (e: Event) => {
      if ((e.target as Element).closest("a")) setOpen(false);
    };
    const escape = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const resize = () => window.innerWidth > 850 && setOpen(false);
    links?.addEventListener("click", close);
    document.addEventListener("keydown", escape);
    window.addEventListener("resize", resize);
    return () => {
      links?.removeEventListener("click", close);
      document.removeEventListener("keydown", escape);
      window.removeEventListener("resize", resize);
      root.classList.remove("mp-menu-aberto");
      document.body.style.overflow = "";
    };
  }, [open, panel]);

  return (
    <>
      <button
        ref={button}
        type="button"
        className={panel ? "icon menu" : "icon mobile-menu"}
        aria-controls={panel ? "t01-menu" : "t02-menu"}
        aria-expanded={open}
        aria-label={open ? "Fechar menu" : "Abrir menu"}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? "✕" : "☰"}
      </button>
      {panel &&
        host &&
        createPortal(
          <nav className="mp-menu-painel" id="t01-menu" aria-label="Menu" hidden={!open}>
            {panel.map((link) => (
              <a key={link.href} href={link.href}>
                {link.label}
              </a>
            ))}
          </nav>,
          host,
        )}
    </>
  );
}

// --- Pop up ------------------------------------------------------------------

interface LightboxItem {
  type: "imagem" | "video";
  src: string;
  caption: string;
  download: string | null;
}

function readItem(node: HTMLElement): LightboxItem | null {
  const type = node.dataset.mpLightbox === "video" ? "video" : "imagem";
  const src = node.dataset.mpLightboxSrc || node.querySelector("img")?.getAttribute("src") || "";
  if (!src) return null;
  return {
    type,
    src,
    caption: node.dataset.mpLightboxLegenda ?? "",
    download: type === "imagem" ? (node.dataset.mpLightboxDownload ?? src) : null,
  };
}

function withAutoplay(src: string) {
  return src + (src.includes("?") ? "&" : "?") + "autoplay=1&rel=0";
}

/**
 * Any element with data-mp-lightbox opens here. The arrows walk the siblings of
 * the same type inside the same [data-mp-lista] container, as in the handoff.
 */
function T02Lightbox() {
  const anchor = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<LightboxItem[]>([]);
  const [index, setIndex] = useState(-1);
  const [networks, setNetworks] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const open = index >= 0 && items[index];

  const close = useCallback(() => {
    setIndex(-1);
    setNetworks(false);
    document.body.style.overflow = "";
  }, []);
  const step = useCallback(
    (delta: number) => {
      setNetworks(false);
      setIndex((i) => (i + delta + items.length) % items.length);
    },
    [items.length],
  );

  useEffect(() => {
    const root = pageRoot(anchor.current);
    if (!root) return;
    const click = (e: MouseEvent) => {
      const node = (e.target as Element).closest<HTMLElement>("[data-mp-lightbox]");
      if (!node || !root.contains(node) || node.closest(".mp-lightbox")) return;
      const own = readItem(node);
      if (!own) return;
      e.preventDefault();
      const group = node.closest("[data-mp-lista]") ?? root;
      const siblings = Array.from(
        group.querySelectorAll<HTMLElement>(`[data-mp-lightbox="${node.dataset.mpLightbox}"]`),
      );
      const set = siblings.map((n) => ({ n, item: readItem(n) })).filter((row) => row.item);
      const at = set.findIndex((row) => row.n === node);
      setItems(at >= 0 ? set.map((row) => row.item!) : [own]);
      setIndex(Math.max(at, 0));
      document.body.style.overflow = "hidden";
    };
    // Keyboard access for figures, which are not natively focusable controls.
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const node = (e.target as Element).closest<HTMLElement>("figure[data-mp-lightbox]");
      if (node) {
        e.preventDefault();
        node.click();
      }
    };
    root.addEventListener("click", click);
    root.addEventListener("keydown", key);
    return () => {
      root.removeEventListener("click", click);
      root.removeEventListener("keydown", key);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "ArrowRight") step(1);
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [open, close, step]);

  const artistName = () => pageRoot(anchor.current)?.getAttribute("data-artist") ?? document.title;
  const artistSlug = () => pageRoot(anchor.current)?.getAttribute("data-slug") ?? "foto";
  const shareUrl = () => (open ? new URL(open.src, location.href).href : location.href);
  const shareText = () => artistName() + (open && open.caption ? ` · ${open.caption}` : "");

  /**
   * On a phone "Partilhar" opens the system sheet with the photo file itself —
   * the only way to reach Instagram, which accepts no shares from web pages.
   * On a computer it falls back to WhatsApp, Facebook, X and copy link.
   */
  async function share() {
    if (!open) return;
    if (navigator.share) {
      try {
        const blob = await (await fetch(open.src)).blob();
        const file = new File([blob], `${artistSlug()}.jpg`, {
          type: blob.type || "image/jpeg",
        });
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: artistName(),
            text: shareText(),
          });
          return;
        }
        await navigator.share({
          title: artistName(),
          text: shareText(),
          url: shareUrl(),
        });
        return;
      } catch (error) {
        if ((error as Error)?.name === "AbortError") return;
      }
    }
    setNetworks((value) => !value);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareUrl());
      setCopied("Link copiado");
    } catch {
      setCopied(shareUrl());
    }
    setTimeout(() => setCopied(null), 2200);
  }

  return (
    <div
      ref={anchor}
      className="mp-lightbox"
      hidden={!open}
      role="dialog"
      aria-modal="true"
      aria-label={open ? open.caption || "Pop up" : undefined}
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.tagName !== "IMG" && target.tagName !== "IFRAME" && !target.closest(".mp-lb-acoes, button")) close();
      }}
    >
      {open && (
        <>
          <button className="mp-lb-fechar" type="button" aria-label="Fechar" onClick={close}>
            ✕
          </button>
          <button
            className="mp-lb-passo mp-lb-anterior"
            type="button"
            aria-label="Anterior"
            hidden={items.length < 2}
            onClick={() => step(-1)}
          >
            ‹
          </button>
          <button
            className="mp-lb-passo mp-lb-seguinte"
            type="button"
            aria-label="Seguinte"
            hidden={items.length < 2}
            onClick={() => step(1)}
          >
            ›
          </button>
          <figure className="mp-lb-palco">
            <div className="mp-lb-media" data-tipo={open.type}>
              {open.type === "video" ? (
                <iframe
                  key={open.src}
                  src={withAutoplay(open.src)}
                  title={open.caption || "Vídeo"}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  allowFullScreen
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={open.src} src={open.src} alt={open.caption} />
              )}
            </div>
            <figcaption className="mp-lb-legenda">{open.caption}</figcaption>
            {open.download && (
              <div className="mp-lb-acoes">
                <a
                  className="mp-lb-acao"
                  href={open.download}
                  download={`${artistSlug()}-${String(index + 1).padStart(2, "0")}`}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5M5 19.5h14"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span>Descarregar</span>
                </a>
                <button className="mp-lb-acao" type="button" aria-expanded={networks} onClick={share}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="18" cy="5.5" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.8" />
                    <circle cx="6" cy="12" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.8" />
                    <circle cx="18" cy="18.5" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M8.3 10.8l7.4-4M8.3 13.2l7.4 4" fill="none" stroke="currentColor" strokeWidth="1.8" />
                  </svg>
                  <span>Partilhar</span>
                </button>
                {networks && (
                  <div className="mp-lb-redes">
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(`${shareText()} ${shareUrl()}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      WhatsApp
                    </a>
                    <a
                      href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl())}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Facebook
                    </a>
                    <a
                      href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText())}&url=${encodeURIComponent(shareUrl())}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      X
                    </a>
                    <button type="button" onClick={copy}>
                      {copied ?? "Copiar link"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </figure>
        </>
      )}
    </div>
  );
}

// --- Biography ---------------------------------------------------------------

export interface T02Chapter {
  text: string;
  mark: string;
  photo: { url: string; alt: string } | null;
}

/**
 * "Biografia com fotografia fixa que acompanha a leitura." One chapter per
 * paragraph; the photo, the mark and the counter follow the chapter in the
 * reading band. State lives here because every class it toggles is React's.
 */
export function T02Bio({
  chapters,
  stats,
}: {
  chapters: T02Chapter[];
  stats: Array<{ value: string; label: string }>;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [live, setLive] = useState(false);
  const [seen, setSeen] = useState<Set<number>>(() => new Set());
  const [mediaSeen, setMediaSeen] = useState(false);
  const photos = chapters.filter((chapter) => chapter.photo);

  useEffect(() => {
    const node = container.current;
    if (!node || !("IntersectionObserver" in window)) return;
    const items = Array.from(node.querySelectorAll(".mp-capitulo"));
    setLive(true);

    const reading = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) setActive(items.indexOf(entry.target));
      },
      // On a phone the photo takes the top half, so the reading band moves down.
      {
        rootMargin: window.innerWidth < 850 ? "-62% 0px -24% 0px" : "-42% 0px -42% 0px",
      },
    );
    const entrance = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entrance.unobserve(entry.target);
          if (entry.target.classList.contains("mp-bio-media")) setMediaSeen(true);
          else setSeen((current) => new Set(current).add(items.indexOf(entry.target)));
        }
      },
      { threshold: 0.14, rootMargin: "0px 0px -6% 0px" },
    );
    items.forEach((item) => {
      reading.observe(item);
      entrance.observe(item);
    });
    const media = node.querySelector(".mp-bio-media");
    if (media) entrance.observe(media);
    return () => {
      reading.disconnect();
      entrance.disconnect();
    };
  }, []);

  const current = chapters[active] ?? chapters[0];

  return (
    <div className={`mp-bio${live ? " mp-bio-vivo" : ""}`} ref={container}>
      <div className={`mp-bio-media${mediaSeen ? " mp-visivel" : ""}`}>
        <div className="mp-bio-fotos" data-mp-lista="">
          {photos.length > 0 &&
            chapters.map((chapter, i) => {
              const photo = chapter.photo ?? photos[i % photos.length].photo!;
              return (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  className={`mp-bio-foto${i === active ? " mp-ativo" : ""}`}
                  src={photo.url}
                  alt={photo.alt}
                  loading="lazy"
                  data-mp-lightbox="imagem"
                  data-mp-lightbox-src={photo.url}
                  data-mp-lightbox-legenda={chapter.mark}
                />
              );
            })}
        </div>
        <span className="mp-bio-marca mp-troca" key={active}>
          {current?.mark}
        </span>
        <span className="mp-bio-contador">
          <b>{String(active + 1).padStart(2, "0")}</b> / <span>{String(chapters.length).padStart(2, "0")}</span>
        </span>
        <span className="mp-bio-progresso">
          <i
            style={{
              transform: `scaleX(${(active + 1) / Math.max(chapters.length, 1)})`,
            }}
          />
        </span>
      </div>
      <div className="mp-bio-texto">
        <div className="mp-capitulos">
          {chapters.map((chapter, i) => (
            <article
              key={i}
              className={`mp-capitulo${i === active ? " mp-ativo" : ""}${seen.has(i) ? " mp-visivel" : ""}`}
            >
              <span className="mp-capitulo-marca">
                <em>{String(i + 1).padStart(2, "0")}</em>
                {chapter.mark && <span>{chapter.mark}</span>}
              </span>
              <p>{chapter.text}</p>
            </article>
          ))}
        </div>
        {stats.length > 0 && (
          <div className="mp-numeros">
            {stats.map((stat, i) => (
              <div className="mp-numero" key={i}>
                <CountUp value={stat.value} />
                <span>{stat.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Counts up to the number inside a value such as "3M+" or "2018" once, on entry. */
function CountUp({ value }: { value: string }) {
  const node = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(value);

  useEffect(() => {
    const target = node.current;
    const match = value.match(/^(\D*)(\d+(?:[.,]\d+)?)(.*)$/);
    if (!target || !match || reducedMotion() || !("IntersectionObserver" in window)) return;
    let raf = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        const goal = parseFloat(match[2].replace(",", "."));
        const isYear = /^(19|20)\d{2}$/.test(match[2]);
        const start = isYear ? goal - 24 : 0;
        const decimals = (match[2].split(/[.,]/)[1] || "").length;
        const t0 = performance.now();
        const tick = (now: number) => {
          const k = Math.min(1, (now - t0) / 1500);
          const eased = 1 - Math.pow(1 - k, 3);
          const v = start + (goal - start) * eased;
          setShown(k < 1 ? match[1] + (decimals ? v.toFixed(decimals) : Math.round(v)) + match[3] : value);
          if (k < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.14 },
    );
    observer.observe(target);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value]);

  return <b ref={node}>{shown}</b>;
}

// --- Booking request ---------------------------------------------------------

/**
 * The handoff's form only assembled a WhatsApp message, because the static page
 * had no server. Here the request is stored first — it lands in the Booking
 * inbox with its history and notification — and WhatsApp stays available as
 * the fast lane when the manager's number is public.
 */
export function T02BookingForm({
  slug,
  artistName,
  whatsapp,
  enabled,
  askChannel = false,
  primaryClass = "button hot",
  secondaryClass = "button",
}: {
  slug: string;
  artistName: string;
  whatsapp: string | null;
  enabled: boolean;
  /**
   * Template 01 · v1: the person chooses how to be answered, WhatsApp or email
   * ("RESPOSTA POR"). The inbox still needs an email to reply from, so the
   * choice travels with the request and makes the phone required for WhatsApp.
   */
  askChannel?: boolean;
  primaryClass?: string;
  secondaryClass?: string;
}) {
  const [channel, setChannel] = useState<"whatsapp" | "email">("whatsapp");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [notice, setNotice] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const v = (name: string) => String(form.get(name) ?? "").trim();
    const text = [
      `Pedido de booking para ${artistName}`,
      `Nome: ${v("promoterName")}`,
      `Evento: ${v("venue")}`,
      `Data: ${v("requestedDate")}`,
      `Local: ${v("city")}`,
      askChannel && (channel === "whatsapp" ? `Resposta por WhatsApp: ${v("promoterPhone")}` : "Resposta por email"),
      v("message") && `Nota: ${v("message")}`,
    ]
      .filter(Boolean)
      .join("\n");
    setMessage(text);

    if (!enabled) {
      setNotice(
        whatsapp
          ? "Esta página não recebe pedidos pelo formulário. Continua no WhatsApp."
          : `Esta página ainda não recebe pedidos. Copia o pedido: ${text.replace(/\n/g, " · ")}`,
      );
      return;
    }

    setState("sending");
    setNotice(null);
    try {
      const response = await fetch("/api/booking-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          dateMode: "specific",
          promoterName: v("promoterName"),
          promoterEmail: v("promoterEmail"),
          promoterPhone: v("promoterPhone") || undefined,
          venue: v("venue") || undefined,
          requestedDate: v("requestedDate"),
          city: v("city") || undefined,
          message:
            [
              askChannel && (channel === "whatsapp" ? "Prefere resposta por WhatsApp." : "Prefere resposta por email."),
              v("message"),
            ]
              .filter(Boolean)
              .join("\n") || undefined,
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setState("idle");
        setNotice(body?.error ?? "Não foi possível enviar o pedido. Tenta outra vez.");
        return;
      }
      setState("sent");
      setNotice(
        body?.message ??
          "Pedido enviado. Isto não é uma reserva confirmada — o artista entrará em contacto para responder.",
      );
    } catch {
      setState("idle");
      setNotice("Sem ligação. O pedido não foi enviado.");
    }
  }

  const whatsappHref = whatsapp && message ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}` : null;

  return (
    <form className="form mp-form" onSubmit={submit}>
      <div className="field">
        <label htmlFor="t02-nome">NOME</label>
        <input id="t02-nome" name="promoterName" required maxLength={120} autoComplete="name" />
      </div>
      <div className="field">
        <label htmlFor="t02-email">EMAIL</label>
        <input id="t02-email" name="promoterEmail" type="email" required maxLength={200} autoComplete="email" />
      </div>
      {askChannel && (
        <fieldset className="mp-canal">
          <legend>RESPOSTA POR</legend>
          {(["whatsapp", "email"] as const).map((value) => (
            <label key={value}>
              <input
                type="radio"
                name="canal"
                value={value}
                checked={channel === value}
                onChange={() => setChannel(value)}
              />
              <span>{value === "whatsapp" ? "WhatsApp" : "Email"}</span>
            </label>
          ))}
        </fieldset>
      )}
      <div className="field">
        <label htmlFor="t02-telefone">
          {askChannel && channel === "whatsapp" ? "O TEU WHATSAPP" : "TELEFONE · OPCIONAL"}
        </label>
        <input
          id="t02-telefone"
          name="promoterPhone"
          type="tel"
          inputMode="tel"
          maxLength={40}
          autoComplete="tel"
          placeholder="+238 000 00 00"
          required={askChannel && channel === "whatsapp"}
        />
      </div>
      <div className="field">
        <label htmlFor="t02-evento">EVENTO OU SALA</label>
        <input id="t02-evento" name="venue" required maxLength={160} />
      </div>
      <div className="field">
        <label htmlFor="t02-data">DATA</label>
        <input id="t02-data" name="requestedDate" type="date" required />
      </div>
      <div className="field">
        <label htmlFor="t02-local">CIDADE E PAÍS</label>
        <input id="t02-local" name="city" required maxLength={80} />
      </div>
      <div className="field">
        <label htmlFor="t02-nota">MENSAGEM</label>
        <textarea
          id="t02-nota"
          name="message"
          rows={3}
          maxLength={4000}
          placeholder="Horário, cachê previsto, tipo de evento"
        />
      </div>
      <button className={primaryClass} type="submit" disabled={state !== "idle"}>
        {state === "sending" ? "A enviar…" : state === "sent" ? "Pedido enviado" : "Enviar pedido"}
      </button>
      {notice && (
        <p className="player-note" role="status">
          {notice}
        </p>
      )}
      {whatsappHref && (
        <a
          className={secondaryClass}
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          style={{ justifySelf: "start", borderColor: "currentColor" }}
        >
          Continuar no WhatsApp <Ext />
        </a>
      )}
    </form>
  );
}
