"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { clientWords, type Lang } from "@/lib/public-content";

/**
 * The client carousel in the hero and the brand ribbon under it, ported from
 * the handoff's landing-clients.js. "Only supplied launch names are shown; more
 * can be appended."
 *
 * Ellputo points at the published My Page (/p/ellputo), which the handoff
 * linked as ellputo/index.html. Kevy Delgado and DJ Deekay keep the Instagram
 * links the handoff chose for them.
 */

interface Client {
  name: string;
  href: string;
  image?: string;
  logo: string;
  logoClass?: string;
  aqva?: boolean;
}

const CLIENTS: Client[] = [
  { name: "Ellputo", image: "/landing/ellputo.webp", logo: "/landing/ellputo-logo-white.png", href: "/p/ellputo" },
  {
    name: "Kevy Delgado",
    logo: "/landing/kevy-logo-transparent.png",
    logoClass: "partner-logo-ink",
    image: "/landing/kevy-partner.webp",
    href: "https://www.instagram.com/djkevydelgado/",
  },
  {
    name: "DJ Deekay",
    logo: "/landing/deekay-logo-transparent.png",
    logoClass: "partner-logo-ink",
    image: "/landing/deekay-partner.webp",
    href: "https://www.instagram.com/djdeekay_",
  },
  { name: "AQVA", logo: "/landing/aqva-logo.png", logoClass: "partner-logo-ink", href: "https://aqva.cv", aqva: true },
];

const SLIDE_MS = 850;
const AUTOPLAY_MS = 5500;

function ClientLink({
  client,
  className,
  children,
  ...rest
}: {
  client: Client;
  className?: string;
  children: React.ReactNode;
  tabIndex?: number;
  "aria-hidden"?: boolean;
  "aria-label"?: string;
}) {
  if (client.href.startsWith("/")) {
    return (
      <Link href={client.href} className={className} {...rest}>
        {children}
      </Link>
    );
  }
  return (
    <a href={client.href} className={className} target="_blank" rel="noopener noreferrer" {...rest}>
      {children}
    </a>
  );
}

function Card({ client, lang, hidden }: { client: Client; lang: Lang; hidden?: boolean }) {
  const t = clientWords[lang];
  return (
    <ClientLink
      client={client}
      className={`client-screen${client.aqva ? " aqva" : ""}`}
      aria-label={`${client.name} · ${t.open}`}
      {...(hidden ? { tabIndex: -1, "aria-hidden": true } : {})}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {client.image && <img src={client.image} alt={client.name} draggable={false} />}
      <div className="screen-chrome" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <div className="screen-overlay">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={`screen-logo ${client.logoClass ?? ""}`} src={client.logo} alt={client.name} />
        <p>{client.aqva ? t.aqva : t.artist}</p>
        <span className="screen-link">{t.open}</span>
      </div>
    </ClientLink>
  );
}

export function ClientCarousel({ lang, reduced }: { lang: Lang; reduced: boolean }) {
  const t = clientWords[lang];
  const count = CLIENTS.length;
  const slides = useRef<HTMLDivElement>(null);
  const moving = useRef(false);
  const [index, setIndex] = useState(0);
  const [incoming, setIncoming] = useState(1);
  const [target, setTarget] = useState<number | null>(null);
  const [stopped, setStopped] = useState(false);
  const [hover, setHover] = useState(false);
  const [visible, setVisible] = useState(true);
  const startX = useRef<number | null>(null);

  // Reduced motion stops the autoplay, as the handoff did.
  useEffect(() => setStopped(reduced), [reduced]);

  useEffect(() => {
    const update = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  // A finished move resets the strip to its resting position before paint.
  useLayoutEffect(() => {
    const strip = slides.current;
    if (!strip) return;
    strip.style.transition = "none";
    strip.style.transform = "translateX(0)";
  }, [index]);

  // Second pass of a move: the incoming card is rendered, slide to it.
  useEffect(() => {
    if (target === null) return;
    const strip = slides.current;
    if (!strip) return;
    const [first, second] = strip.children as unknown as HTMLElement[];
    const distance = second.offsetLeft - first.offsetLeft;
    strip.getBoundingClientRect();
    strip.style.transition = `transform ${SLIDE_MS}ms cubic-bezier(.22,.7,.2,1)`;
    strip.style.transform = `translateX(-${distance}px)`;
    const done = setTimeout(() => {
      setIndex(target);
      setIncoming((target + 1) % count);
      setTarget(null);
      moving.current = false;
    }, SLIDE_MS + 20);
    return () => clearTimeout(done);
  }, [target, count]);

  function move(to: number) {
    if (moving.current || to === index) return;
    if (reduced) {
      setIndex(to);
      setIncoming((to + 1) % count);
      return;
    }
    moving.current = true;
    setIncoming(to);
    setTarget(to);
  }

  useEffect(() => {
    if (stopped || hover || !visible || reduced || target !== null) return;
    const timer = setTimeout(() => move((index + 1) % count), AUTOPLAY_MS);
    return () => clearTimeout(timer);
    // `move` reads the same state this effect depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopped, hover, visible, reduced, target, index, count]);

  const caption = `${String(index + 1).padStart(2, "0")} / ${String(count).padStart(2, "0")} · ${t.preview}`;

  return (
    <div
      className="client-carousel"
      role="region"
      aria-roledescription="carousel"
      aria-label={t.preview}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHover(false);
      }}
    >
      <div className="client-backdrop" aria-hidden="true" />
      <div
        className="client-viewport"
        onTouchStart={(event) => {
          startX.current = event.touches[0].clientX;
        }}
        onTouchEnd={(event) => {
          if (startX.current === null) return;
          const dx = event.changedTouches[0].clientX - startX.current;
          if (Math.abs(dx) > 45) move((index + (dx < 0 ? 1 : count - 1)) % count);
          startX.current = null;
        }}
      >
        <div className="client-slides" ref={slides}>
          <Card key={`a-${index}`} client={CLIENTS[index]} lang={lang} />
          <Card key={`b-${incoming}`} client={CLIENTS[incoming]} lang={lang} hidden />
        </div>
      </div>
      <div className="carousel-bottom">
        <div className="carousel-pager">
          <div className="carousel-dots">
            {CLIENTS.map((client, i) => (
              <button
                key={client.name}
                type="button"
                aria-label={client.name}
                aria-current={i === index}
                onClick={() => move(i)}
              />
            ))}
          </div>
          <span className="carousel-caption">{caption}</span>
        </div>
        <div className="carousel-controls">
          <button type="button" aria-label={t.prev} onClick={() => move((index + count - 1) % count)}>
            ←
          </button>
          <button
            type="button"
            aria-label={stopped ? t.play : t.pause}
            aria-pressed={stopped}
            onClick={() => setStopped((value) => !value)}
          >
            {stopped ? "▶" : "Ⅱ"}
          </button>
          <button type="button" aria-label={t.next} onClick={() => move((index + 1) % count)}>
            →
          </button>
        </div>
      </div>
    </div>
  );
}

export function BrandRibbon({ lang }: { lang: Lang }) {
  const t = clientWords[lang];
  const [paused, setPaused] = useState(false);
  return (
    <>
      <div className={`brand-ribbon${paused ? " paused" : ""}`}>
        <div className="brand-track">
          {[false, true].map((duplicate) => (
            <div
              key={String(duplicate)}
              className={`brand-group${duplicate ? " duplicate" : ""}`}
              aria-hidden={duplicate || undefined}
            >
              {CLIENTS.map((client) => (
                <ClientLink
                  key={client.name}
                  client={client}
                  className={client.aqva ? "aqva-word" : client.name === "DJ Deekay" ? "deekay-word" : ""}
                  {...(duplicate ? { tabIndex: -1 } : {})}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={client.logo} alt={client.name} className={client.logoClass ?? ""} />
                </ClientLink>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="wrap ribbon-controls">
        <span>{t.ribbon}</span>
        <button type="button" aria-pressed={paused} onClick={() => setPaused((value) => !value)}>
          {paused ? t.playBrands : t.pauseBrands}
        </button>
      </div>
    </>
  );
}
