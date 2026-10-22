"use client";

import Link from "next/link";
import { Fragment, useEffect, useRef, useState } from "react";
import { audiences, clientWords, copy, menuWords, sectorMore, services } from "@/lib/public-content";
import {
  LanguageSelect,
  ServiceIcon,
  UtilityLinks,
  Wordmark,
  useLanguage,
  useReducedMotion,
  useReveal,
  useTitleDrift,
} from "./shared";
import { SECTOR_KEYS, SERVICE_KEYS, sectorHref, serviceHref } from "@/lib/public-routes";
import { BrandRibbon, ClientCarousel } from "./Clients";

/**
 * Landing page, a port of the handoff's my-page-landing.html.
 *
 * The handoff built the page in two passes: static markup, then scripts that
 * rewrote it (landing-clients.js swapped the hero art for the client
 * carousel and the ticker for the brand ribbon, landing-navigation.js moved
 * the links into a left dock and wrapped each category label with its title,
 * landing-sectors.js added the sector links). This renders the final result
 * directly. Class names are the handoff's, so src/styles/public.css applies
 * unchanged.
 *
 * Changes for the app:
 *   - "Entrar" / "Criar conta" go to the real /login and /signup (the handoff
 *     sent them to prototype screens waiting for Muska accounts).
 *   - Ellputo's card opens the published page at /p/ellputo.
 *   - The footer's "backoffice de demonstração" link opens the real
 *     backoffice, /studio, and says so.
 *   - Service and sector pages live at /servicos/<key> and /setores/<key>.
 */

const BACKOFFICE_LINK = {
  pt: "Entrar no backoffice ↗",
  en: "Go to the backoffice ↗",
  fr: "Accéder au backoffice ↗",
} as const;

const PARTNERS: [string, string][] = [
  ["Muska", "#ecosystem"],
  ["Aqva", "https://aqva.cv"],
  ["Muska Live", "https://muskalive.com"],
  ["My Page", "#top"],
  ["Muska App", "#ecosystem"],
];

const ARTISTS = [
  { name: "Ellputo", image: "/landing/ellputo.webp", href: "/p/ellputo" },
  { name: "Kevy Delgado", image: "/landing/kevy-partner.webp", href: "https://www.instagram.com/djkevydelgado/" },
  { name: "DJ Deekay", image: "/landing/deekay-partner.webp", href: "https://www.instagram.com/djdeekay_" },
];

const EXTERNAL = { target: "_blank", rel: "noopener noreferrer" } as const;

export function Landing() {
  const root = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLDialogElement>(null);
  const [lang, setLang] = useLanguage();
  const reduced = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const t = copy[lang];
  const words = clientWords[lang];
  const menuText = menuWords[lang];

  useReveal(root, reduced);
  useTitleDrift(root, reduced);

  useEffect(() => {
    document.title = t.title;
    document.querySelector('meta[name="description"]')?.setAttribute("content", t.description);
  }, [t]);

  useEffect(() => {
    const update = () => setScrolled(scrollY > 80);
    update();
    addEventListener("scroll", update, { passive: true });
    return () => removeEventListener("scroll", update);
  }, []);

  function toggleTheme() {
    const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("mypage-theme", next);
    } catch {
      // The choice simply does not persist.
    }
  }

  function openMenu() {
    menu.current?.showModal();
    setMenuOpen(true);
  }

  function closeMenu() {
    menu.current?.close();
  }

  // The dock and the menu dialog each carry a copy of the links; CSS shows the
  // dock copy from 1060px up and the menu below that.
  function navLinks(inMenu: boolean) {
    const links: [string, string][] = [
      ["#services", t.navServices],
      ["#ecosystem", t.navWho],
      ["#artists", t.navArtists],
    ];
    return (
      <nav aria-label={t.navServices}>
        {links.map(([href, text], i) => (
          <a
            key={href}
            href={href}
            style={{ "--link-index": i } as React.CSSProperties}
            onClick={inMenu ? closeMenu : undefined}
          >
            {text}
          </a>
        ))}
      </nav>
    );
  }

  function actions(inMenu: boolean) {
    return (
      <div className="nav-actions">
        <label className="language">
          <span className="sr">{t.language}</span>
          <LanguageSelect id={inMenu ? "menuLanguage" : "language"} lang={lang} onChange={setLang} label={t.language} />
        </label>
        <button type="button" className="icon-button" aria-label={t.theme} onClick={toggleTheme}>
          ◐
        </button>
        <Link className="login" href="/login">
          {t.login}
        </Link>
        <Link className="button primary nav-start" href="/signup">
          {t.start}
        </Link>
      </div>
    );
  }

  const sectionTitle = (kicker: string, title: string) => (
    <div className="title-lockup">
      <span className="kicker">{kicker}</span>
      <h2>{title}</h2>
    </div>
  );

  return (
    <div className="pub" ref={root}>
      <a className="skip" href="#services">
        {t.skip}
      </a>
      <div className="ambient" aria-hidden="true">
        <i />
        <i />
      </div>

      <header className={`navigation glass left-dock expanded-nav${scrolled ? " is-scrolled" : ""}`}>
        <a className="wordmark" href="#top" aria-label="My Page">
          <Wordmark width={240} height={65} />
          <small>by MUSKA</small>
        </a>
        {navLinks(false)}
        {actions(false)}
        <button
          type="button"
          className="menu-trigger"
          aria-expanded={menuOpen}
          aria-controls="leftNavigation"
          aria-haspopup="dialog"
          aria-label={menuText.open}
          onClick={openMenu}
        >
          <span className="menu-trigger-lines" aria-hidden="true">
            <i />
            <i />
          </span>
          <span>{menuText.menu}</span>
        </button>
      </header>

      <dialog
        ref={menu}
        id="leftNavigation"
        className="left-menu glass"
        aria-labelledby="leftMenuTitle"
        onClose={() => setMenuOpen(false)}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          const r = event.currentTarget.getBoundingClientRect();
          if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) {
            closeMenu();
          }
        }}
      >
        <div className="menu-head">
          <span id="leftMenuTitle">MY PAGE / MUSKA</span>
          <button type="button" className="menu-close" aria-label={menuText.close} onClick={closeMenu}>
            ×
          </button>
        </div>
        {navLinks(true)}
        {actions(true)}
      </dialog>

      <main id="top">
        <section className="hero wrap">
          <div className="hero-top">
            <span className="edition">MY PAGE / MUSKA ECOSYSTEM</span>
          </div>
          <h1>
            <span className="line">
              <span>{t.hero1}</span>
            </span>
            <span className="line">
              <span className="gradient">{t.hero2}</span>
            </span>
            <span className="hero-handwriting">{words.note}</span>
          </h1>
          <div className="hero-bottom">
            <div>
              <p className="intro">{t.heroBody}</p>
              <div className="button-row">
                <a className="button primary" href="#services">
                  <span>{t.discover}</span> →
                </a>
                <Link className="button" href="/signup">
                  <span>{t.create}</span> →
                </Link>
              </div>
              <p className="caption">{t.oneAccount}</p>
            </div>
            <ClientCarousel lang={lang} reduced={reduced} />
          </div>
          <a href="#services" className="scroll-cue">
            <span>{t.scroll}</span> ↓
          </a>
        </section>

        <BrandRibbon lang={lang} />

        <section id="services" className="wrap section">
          <div className="section-head reveal">
            <div>{sectionTitle(t.servicesTag, t.servicesTitle)}</div>
            <p>{t.servicesBody}</p>
          </div>
          <div className="service-grid" id="serviceGrid">
            {services.map((service, i) => {
              const [title, body] = service[lang];
              const key = SERVICE_KEYS[i];
              return (
                <article key={key} className="service glass reveal">
                  <div className="service-top">{service.future && <span className="status">{t.soon}</span>}</div>
                  <ServiceIcon name={key} />
                  <h3>{title}</h3>
                  <p>{body}</p>
                  <Link className="service-link" href={serviceHref(key)} aria-label={`${t.details}: ${title}`}>
                    {t.details}
                    <span>→</span>
                  </Link>
                </article>
              );
            })}
          </div>
        </section>

        <section className="ecosystem section" id="ecosystem">
          <div className="wrap">
            <div className="section-head reveal">
              <div>{sectionTitle(t.whoTag, t.whoTitle)}</div>
              <p>{t.whoBody}</p>
            </div>
            <div id="audiences" className="audiences">
              {audiences[lang].map(([title, body, tags], i) => (
                <article key={SECTOR_KEYS[i]} className="audience reveal">
                  <h3>
                    <Link className="sector-link" href={sectorHref(SECTOR_KEYS[i])}>
                      {title}
                    </Link>
                  </h3>
                  <div>
                    <p>{body}</p>
                    <div className="tags">
                      {tags.map((tag) => (
                        <span key={tag}>{tag}</span>
                      ))}
                    </div>
                    <Link className="sector-more" href={sectorHref(SECTOR_KEYS[i])}>
                      {sectorMore[lang]} ↗
                    </Link>
                  </div>
                </article>
              ))}
            </div>
            <p className="template-note">{t.templateNote}</p>
          </div>
        </section>

        <section className="wrap section" id="artists">
          <div className="section-head reveal">
            <div>{sectionTitle(t.artistsTag, t.artistsTitle)}</div>
            <div>
              <p>{words.community}</p>
              <a className="text-link" href="https://muskalive.com" {...EXTERNAL}>
                <span>{t.explore}</span> ↗
              </a>
            </div>
          </div>
          <div className="artist-grid">
            {ARTISTS.map((artist) => {
              const inner = (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={artist.image} alt={artist.name} loading="lazy" />
                  <div>
                    <span>{t.artistRole}</span>
                    <h3>{artist.name}</h3>
                    <b>↗</b>
                  </div>
                </>
              );
              return artist.href.startsWith("/") ? (
                <Link key={artist.name} className="artist reveal" href={artist.href}>
                  {inner}
                </Link>
              ) : (
                <a key={artist.name} className="artist reveal" href={artist.href} {...EXTERNAL}>
                  {inner}
                </a>
              );
            })}
            <a className="artist reveal aqva-community" href="https://aqva.cv" {...EXTERNAL}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="aqva-display partner-logo-ink" src="/landing/aqva-logo.png" alt="AQVA" />
              <div>
                <span>{words.aqvaType}</span>
                <h3>Aqva</h3>
                <b>↗</b>
              </div>
            </a>
          </div>
          <div className="ecosystem-partners reveal">
            <span className="kicker">{t.connected}</span>
            <div>
              {PARTNERS.map(([name, href], i) => (
                <Fragment key={name}>
                  {i > 0 && <span aria-hidden="true">·</span>}
                  <a href={href} {...(href.startsWith("https:") ? EXTERNAL : {})}>
                    {name}
                  </a>
                </Fragment>
              ))}
            </div>
          </div>
        </section>

        <section className="wrap section closing">
          <div className="glass closing-panel reveal">
            {sectionTitle(t.closingTag, t.closingTitle)}
            <div className="closing-bottom">
              <p>{t.closingBody}</p>
              <Link className="button primary" href="/signup">
                <span>{t.create}</span> →
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="wrap">
        <a className="wordmark" href="#top" aria-label="My Page">
          <Wordmark width={170} height={46} />
        </a>
        <span>© {new Date().getFullYear()} My Page · Muska</span>
        <Link href="/studio">{BACKOFFICE_LINK[lang]}</Link>
      </footer>
      <UtilityLinks lang={lang} />
    </div>
  );
}
