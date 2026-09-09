"use client";

import { useEffect } from "react";

/**
 * The landing's motion layer.
 *
 * Doc 01: "Manter fundo navy, glows laranja/azul em movimento subtil, revelação
 * suave durante scroll e ticker ligeiramente inclinado (...). Respeitar
 * preferência de movimento reduzido."
 *
 * Three behaviours, all progressive enhancements: the page is complete and
 * readable if this component never runs. Reduced motion skips the parallax and
 * the tilt entirely and reveals every section immediately.
 */
export function LandingMotion() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cleanups: Array<() => void> = [];

    // --- Scroll reveal ---
    const revealItems = Array.from(document.querySelectorAll<HTMLElement>(".lp-reveal"));
    if (reduced || typeof IntersectionObserver === "undefined") {
      revealItems.forEach((item) => item.classList.add("is-visible"));
    } else {
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        },
        { threshold: 0.12, rootMargin: "0px 0px -35px 0px" },
      );
      revealItems.forEach((item) => observer.observe(item));
      cleanups.push(() => observer.disconnect());
    }

    if (!reduced) {
      // --- Parallax on the hero glows ---
      const layers = Array.from(document.querySelectorAll<HTMLElement>("[data-parallax]"));
      if (layers.length) {
        let frame = 0;
        const onScroll = () => {
          if (frame) return;
          frame = requestAnimationFrame(() => {
            frame = 0;
            for (const layer of layers) {
              const rate = Number.parseFloat(layer.dataset.parallax ?? "0");
              layer.style.transform = `translate3d(0, ${window.scrollY * rate}px, 0)`;
            }
          });
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        cleanups.push(() => {
          window.removeEventListener("scroll", onScroll);
          if (frame) cancelAnimationFrame(frame);
        });
      }

      // --- Showcase tilt, pointer devices only ---
      const stage = document.getElementById("lp-showcase");
      const panel = stage?.querySelector<HTMLElement>(".lp-panel.main");
      if (stage && panel && window.matchMedia("(pointer: fine)").matches) {
        const rest = "rotateY(-9deg) rotateX(3deg)";
        const onMove = (event: MouseEvent) => {
          const box = stage.getBoundingClientRect();
          const x = (event.clientX - box.left) / box.width - 0.5;
          const y = (event.clientY - box.top) / box.height - 0.5;
          panel.style.transform = `rotateY(${x * 9 - 7}deg) rotateX(${y * -7 + 3}deg) translate3d(${x * 8}px, ${y * 7}px, 0)`;
        };
        const onLeave = () => {
          panel.style.transform = rest;
        };
        stage.addEventListener("mousemove", onMove);
        stage.addEventListener("mouseleave", onLeave);
        cleanups.push(() => {
          stage.removeEventListener("mousemove", onMove);
          stage.removeEventListener("mouseleave", onLeave);
        });
      }
    }

    return () => cleanups.forEach((fn) => fn());
  }, []);

  return null;
}
