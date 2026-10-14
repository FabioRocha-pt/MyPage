"use client";

import { useEffect, useRef } from "react";

/**
 * Template 06 (Página 3 · DJs & Producers) — the interactive half, ported from
 * the handoff's `site.js` and `gallery.js` and scoped to the page root instead
 * of `document`, so it can share the document with the app.
 *
 * What it does, as VISUAL-E-INTERACOES.md lists it:
 *   - menu: click opens/closes, a link closes, Escape closes and returns focus;
 *   - "Pause motion": suspends decorative motion and the carousel's autoplay
 *     (manual navigation stays); prefers-reduced-motion does the same;
 *   - hero parallax: 12% of the scroll, clamped to -20…95 px, desktop only;
 *   - pieces assemble once when they scroll in;
 *   - About carousel: every 5 s while visible, paused on hover/focus, hidden
 *     tab or manual pause;
 *   - YouTube opens in a dialog; closing removes the iframe and returns focus;
 *   - gallery dialog: previous/next cycle, arrow keys, Escape;
 *   - local films: starting one pauses the other; a hidden tab pauses both.
 *
 * Every hidden state depends on a class added here, after hydration: without
 * JavaScript the page is complete and the gallery links open the files.
 * The renderer outputs the markup; this only toggles classes, attributes and
 * the dialogs' contents, which React never renders into.
 */

export function T06Behaviour() {
  const anchor = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = anchor.current?.closest<HTMLElement>(".t06");
    if (!root) return;
    const $ = <T extends Element = HTMLElement>(selector: string) => root.querySelector<T>(selector);
    const $$ = <T extends Element = HTMLElement>(selector: string) => [...root.querySelectorAll<T>(selector)];
    const cleanups: Array<() => void> = [];
    const on = (target: EventTarget, type: string, fn: EventListener, opts?: AddEventListenerOptions) => {
      target.addEventListener(type, fn, opts);
      cleanups.push(() => target.removeEventListener(type, fn, opts));
    };

    // --- Menu ------------------------------------------------------------------
    const menu = $("button.menu");
    const nav = $("#navigation");
    const closeMenu = () => {
      nav?.classList.remove("open");
      menu?.setAttribute("aria-expanded", "false");
    };
    if (menu && nav) {
      on(menu, "click", () => menu.setAttribute("aria-expanded", String(nav.classList.toggle("open"))));
      on(nav, "click", (e) => {
        if ((e.target as Element).closest("a")) closeMenu();
      });
      on(document, "keydown", (e) => {
        if ((e as KeyboardEvent).key === "Escape" && nav.classList.contains("open")) {
          closeMenu();
          menu.focus();
        }
      });
    }

    // --- Motion: pause button, parallax, pieces -----------------------------------
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const motionButton = $<HTMLButtonElement>(".motion-toggle");
    let manualPause = false;
    let motionOff = reduced.matches;
    let raf = 0;
    const collage = $(".hero-collage");
    const hero = $(".hero");

    const drawParallax = () => {
      raf = 0;
      if (!collage || !hero) return;
      if (motionOff || window.innerWidth < 701) {
        collage.style.removeProperty("--parallax-y");
        return;
      }
      const r = hero.getBoundingClientRect();
      if (r.bottom > 0 && r.top < window.innerHeight) {
        collage.style.setProperty("--parallax-y", `${Math.min(95, Math.max(-20, -r.top * 0.12))}px`);
      }
    };
    const requestFrame = () => {
      if (!raf) raf = requestAnimationFrame(drawParallax);
    };
    on(window, "scroll", requestFrame, { passive: true });
    on(window, "resize", requestFrame, { passive: true });
    cleanups.push(() => cancelAnimationFrame(raf));

    const pieces = $$(
      ".world-card,.audience-grid>a,.timeline article,.tracks article,.campaign-list article,.video-grid>a,.collab-grid>div,.award-list article,.about-copy,.portrait-carousel,.portrait-single,.section-heading,.listen-panel,.booking-grid>a",
    );
    let observer: IntersectionObserver | undefined;
    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        (entries) =>
          entries.forEach((e) => {
            if (e.isIntersecting) {
              e.target.classList.remove("piece-pending");
              observer!.unobserve(e.target);
            }
          }),
        { threshold: 0.06, rootMargin: "0px 0px -20px 0px" },
      );
      pieces.forEach((el, i) => {
        el.classList.add("assemble");
        el.style.setProperty("--piece-x", `${i % 2 ? 35 : -35}px`);
        el.style.setProperty("--piece-r", `${i % 2 ? 2 : -2}deg`);
        el.style.setProperty("--piece-delay", `${(i % 3) * 75}ms`);
        if (!motionOff && el.getBoundingClientRect().top > window.innerHeight) {
          el.classList.add("piece-pending");
          observer!.observe(el);
        }
      });
      cleanups.push(() => observer!.disconnect());
    }

    // --- About carousel ------------------------------------------------------------
    const carousel = $(".portrait-carousel");
    const slides = carousel ? [...carousel.querySelectorAll<HTMLElement>(".portrait-slide")] : [];
    const slidePause = carousel?.querySelector<HTMLButtonElement>(".slide-pause") ?? null;
    const index = carousel?.querySelector<HTMLElement>(".portrait-index") ?? null;
    let current = 0;
    let timer: ReturnType<typeof setInterval> | undefined;
    let carouselPaused = false;
    let visible = false;
    let hovering = false;
    let focused = false;

    const showSlide = (n: number) => {
      if (!slides.length) return;
      current = (n + slides.length) % slides.length;
      slides.forEach((img, i) => {
        img.classList.toggle("active", i === current);
        img.setAttribute("aria-hidden", String(i !== current));
      });
      if (index) {
        index.textContent = `${String(current + 1).padStart(2, "0")} / ${String(slides.length).padStart(2, "0")}`;
      }
    };
    const schedule = () => {
      clearInterval(timer);
      if (!carousel) return;
      if (!motionOff && !carouselPaused && visible && !hovering && !focused && !document.hidden) {
        timer = setInterval(() => showSlide(current + 1), 5000);
      }
      if (slidePause) {
        slidePause.textContent = motionOff ? "Auto off" : carouselPaused ? "Play" : "Pause";
        slidePause.disabled = motionOff;
        slidePause.setAttribute("aria-pressed", String(carouselPaused || motionOff));
      }
    };
    cleanups.push(() => clearInterval(timer));
    if (carousel) {
      carousel.querySelectorAll<HTMLElement>("[data-slide]").forEach((button) =>
        on(button, "click", () => {
          showSlide(current + Number(button.dataset.slide));
          schedule();
        }),
      );
      if (slidePause) {
        on(slidePause, "click", () => {
          carouselPaused = !carouselPaused;
          schedule();
        });
      }
      on(carousel, "mouseenter", () => {
        hovering = true;
        schedule();
      });
      on(carousel, "mouseleave", () => {
        hovering = false;
        schedule();
      });
      on(carousel, "focusin", () => {
        focused = true;
        schedule();
      });
      on(carousel, "focusout", (e) => {
        if (!carousel.contains((e as FocusEvent).relatedTarget as Node | null)) {
          focused = false;
          schedule();
        }
      });
      on(document, "visibilitychange", schedule);
      if ("IntersectionObserver" in window) {
        const seen = new IntersectionObserver(
          (entries) => {
            visible = entries[0].isIntersecting;
            schedule();
          },
          { threshold: 0.15 },
        );
        seen.observe(carousel);
        cleanups.push(() => seen.disconnect());
      }
    }

    // --- Media pieces (gallery, stories) -----------------------------------------
    const mediaPieces = $$(".gallery-shot,.story-film,.story-cutout,.story-type,.experience-film");
    let mediaObserver: IntersectionObserver | undefined;
    const revealMedia = () =>
      mediaPieces.forEach((piece) => {
        piece.classList.remove("media-pending");
        mediaObserver?.unobserve(piece);
      });
    if ("IntersectionObserver" in window && !motionOff) {
      mediaObserver = new IntersectionObserver(
        (entries) =>
          entries.forEach((e) => {
            if (e.isIntersecting) {
              e.target.classList.remove("media-pending");
              mediaObserver!.unobserve(e.target);
            }
          }),
        { threshold: 0.08 },
      );
      mediaPieces.forEach((piece) => {
        piece.classList.add("media-piece");
        if (piece.getBoundingClientRect().top > window.innerHeight) {
          piece.classList.add("media-pending");
          mediaObserver!.observe(piece);
        }
      });
      cleanups.push(() => mediaObserver!.disconnect());
    }

    const updateMotion = () => {
      motionOff = manualPause || reduced.matches;
      root.classList.toggle("motion-paused", motionOff);
      if (motionButton) {
        motionButton.textContent = reduced.matches ? "Reduced motion" : motionOff ? "Resume motion" : "Pause motion";
        motionButton.disabled = reduced.matches;
        motionButton.setAttribute("aria-pressed", String(motionOff));
      }
      if (motionOff) {
        pieces.forEach((el) => {
          el.classList.remove("piece-pending");
          observer?.unobserve(el);
        });
        revealMedia();
      }
      requestFrame();
      schedule();
    };
    on(reduced, "change", updateMotion);
    if (motionButton) {
      on(motionButton, "click", () => {
        manualPause = !manualPause;
        updateMotion();
      });
    }
    updateMotion();

    // --- Dialogs -------------------------------------------------------------------
    const closeOnBackdrop = (dialog: HTMLDialogElement) =>
      on(dialog, "click", (e) => {
        if (e.target !== dialog) return;
        const r = dialog.getBoundingClientRect();
        const { clientX: x, clientY: y } = e as MouseEvent;
        if (x < r.left || x > r.right || y < r.top || y > r.bottom) dialog.close();
      });
    const modifier = (e: Event) => {
      const m = e as MouseEvent;
      return m.ctrlKey || m.metaKey || m.shiftKey || m.altKey;
    };

    const videoDialog = $<HTMLDialogElement>(".video-dialog");
    if (videoDialog) {
      const player = videoDialog.querySelector<HTMLElement>(".video-player")!;
      const fallback = videoDialog.querySelector<HTMLAnchorElement>(".video-fallback")!;
      let opener: HTMLElement | null = null;
      $$<HTMLAnchorElement>("[data-video]").forEach((link) =>
        on(link, "click", (e) => {
          if (typeof videoDialog.showModal !== "function" || modifier(e)) return;
          e.preventDefault();
          opener = link;
          const frame = document.createElement("iframe");
          frame.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(link.dataset.video ?? "")}`;
          frame.title = link.dataset.title ?? "Video";
          frame.allow = "encrypted-media; fullscreen; picture-in-picture";
          frame.allowFullscreen = true;
          frame.referrerPolicy = "strict-origin-when-cross-origin";
          player.replaceChildren(frame);
          fallback.href = link.href;
          videoDialog.showModal();
        }),
      );
      on(videoDialog.querySelector(".video-close")!, "click", () => videoDialog.close());
      on(videoDialog, "close", () => {
        player.replaceChildren();
        opener?.focus();
      });
      closeOnBackdrop(videoDialog);
    }

    const galleryDialog = $<HTMLDialogElement>(".gallery-dialog");
    const shots = $$<HTMLAnchorElement>("[data-gallery]");
    if (galleryDialog && shots.length) {
      const image = galleryDialog.querySelector<HTMLImageElement>(".gallery-full")!;
      const caption = galleryDialog.querySelector<HTMLElement>(".gallery-caption")!;
      let shot = 0;
      let opener: HTMLElement | null = null;
      const show = (n: number) => {
        shot = (n + shots.length) % shots.length;
        const target = shots[shot];
        image.src = target.href;
        image.alt = target.querySelector("img")?.alt ?? "";
        caption.textContent = `${shot + 1} / ${shots.length} · ${image.alt}`;
      };
      shots.forEach((target, i) =>
        on(target, "click", (e) => {
          if (modifier(e) || typeof galleryDialog.showModal !== "function") return;
          e.preventDefault();
          opener = target;
          show(i);
          galleryDialog.showModal();
        }),
      );
      on(galleryDialog.querySelector(".gallery-close")!, "click", () => galleryDialog.close());
      galleryDialog
        .querySelectorAll<HTMLElement>("[data-gallery-step]")
        .forEach((button) => on(button, "click", () => show(shot + Number(button.dataset.galleryStep))));
      // One photo: the arrows have nowhere to go.
      if (shots.length < 2) galleryDialog.querySelectorAll<HTMLElement>("[data-gallery-step]").forEach((b) => (b.hidden = true));
      on(galleryDialog, "keydown", (e) => {
        const key = (e as KeyboardEvent).key;
        if ((key === "ArrowLeft" || key === "ArrowRight") && shots.length > 1) {
          e.preventDefault();
          show(shot + (key === "ArrowLeft" ? -1 : 1));
        }
      });
      on(galleryDialog, "close", () => {
        image.removeAttribute("src");
        opener?.focus();
      });
      closeOnBackdrop(galleryDialog);
    }

    // --- Local films: native controls, never two at once, never autoplay -----------
    const films = $$<HTMLVideoElement>("video");
    films.forEach((film) =>
      on(film, "play", () =>
        films.forEach((other) => {
          if (other !== film) other.pause();
        }),
      ),
    );
    on(document, "visibilitychange", () => {
      if (document.hidden) films.forEach((film) => film.pause());
    });

    return () => cleanups.forEach((fn) => fn());
  }, []);

  return <span ref={anchor} hidden />;
}
