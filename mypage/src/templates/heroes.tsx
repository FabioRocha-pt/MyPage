import type { PageSnapshot } from "@/lib/page-model";

/**
 * The five heroes.
 *
 * Doc 01: "01: hero panorâmico/imersivo. 02: editorial dividido. 03: direção
 * editorial crua, tipografia forte. 04: Ember, laranja/creme, página enquadrada
 * e composição assimétrica. 05: retrato único dominante, grelha e painéis sobre
 * a fotografia."
 *
 * "Os cinco devem ter look and feel realmente distintos, mas consumir os mesmos
 * dados." The hero is where that distinction is structural rather than merely
 * cosmetic — below the fold every template shares `SectionStack`.
 */

interface HeroProps {
  snapshot: PageSnapshot;
}

function heroLinks(snapshot: PageSnapshot) {
  return snapshot.links.filter((link) => link.placement === "hero" || link.placement === "both");
}

function navItems(snapshot: PageSnapshot) {
  const labels: Record<string, string> = {
    music: "Music",
    video: "Video",
    events: "Events",
    press: "Press",
    booking: "Booking",
    donations: "Support",
    store: "Store",
    biography: "About",
  };
  return snapshot.sections
    .filter((section) => section.enabled && section.id !== "hero" && labels[section.id])
    .sort((a, b) => a.position - b.position)
    .map((section) => ({ href: `#${section.id}`, label: labels[section.id] }));
}

/** 01 · Immersive — full-bleed panoramic photo, oversized wordmark. */
export function Hero01({ snapshot }: HeroProps) {
  const { profile, images } = snapshot;
  return (
    <header className="tpl-hero tpl-hero-01" id="top">
      {images.hero && (
        <div className="tpl-hero-media">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={images.hero.url} alt="" fetchPriority="high" />
        </div>
      )}
      <nav className="tpl-nav" aria-label="Secções da página">
        <span className="tpl-wordmark">{profile.displayName}</span>
        <ul>
          {navItems(snapshot).map((item) => (
            <li key={item.href}>
              <a href={item.href}>{item.label}</a>
            </li>
          ))}
        </ul>
      </nav>
      <div className="tpl-hero-content tpl-inner">
        <div>
          <div className="tpl-kicker">
            {[profile.genres[0], profile.city, profile.country].filter(Boolean).join(" · ")}
          </div>
          <h1>{profile.displayName}</h1>
          {profile.genres.length > 0 && <div className="tpl-genres">{profile.genres.join(" · ")}</div>}
          {profile.tagline && <p className="tpl-lede">{profile.tagline}</p>}
        </div>
        {heroLinks(snapshot).length > 0 && (
          <ul className="tpl-hero-social">
            {heroLinks(snapshot).map((link) => (
              <li key={link.url}>
                <a href={link.url} target="_blank" rel="noopener noreferrer">
                  {link.label} ↗
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </header>
  );
}

/** 02 · Editorial — split hero, photo left, accent panel right. */
export function Hero02({ snapshot }: HeroProps) {
  const { profile, images } = snapshot;
  const photo = images.hero ?? images.portrait;
  return (
    <header className="tpl-hero tpl-hero-02" id="top">
      <nav className="tpl-nav" aria-label="Secções da página">
        <span className="tpl-wordmark">{profile.displayName}</span>
        <ul>
          {navItems(snapshot).map((item) => (
            <li key={item.href}>
              <a href={item.href}>{item.label}</a>
            </li>
          ))}
        </ul>
      </nav>
      <div className="tpl-hero-split">
        <div className="tpl-hero-image">
          {photo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo.url} alt="" fetchPriority="high" />
          )}
          <span className="tpl-vertical">
            {[profile.city, profile.country].filter(Boolean).join(" · ")}
          </span>
        </div>
        <div className="tpl-hero-panel">
          <div className="tpl-hero-meta">
            <span>{profile.genres[0] ?? "Artist"}</span>
            <span>{profile.genres[1] ?? ""}</span>
          </div>
          <h1>{profile.displayName}</h1>
          <div className="tpl-hero-tag">
            {profile.tagline && <p>{profile.tagline}</p>}
            <a className="tpl-round" href="#booking" aria-label="Ir para booking">
              ↗
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}

/** 03 · Raw — paper background, huge red type, asymmetric grid. */
export function Hero03({ snapshot }: HeroProps) {
  const { profile, images } = snapshot;
  const photo = images.portrait ?? images.hero;
  return (
    <header className="tpl-hero tpl-hero-03" id="top">
      <nav className="tpl-nav" aria-label="Secções da página">
        <span className="tpl-wordmark">{profile.displayName}</span>
        <ul>
          {navItems(snapshot).map((item) => (
            <li key={item.href}>
              <a href={item.href}>{item.label}</a>
            </li>
          ))}
        </ul>
        <div className="tpl-nav-social">
          {heroLinks(snapshot).slice(0, 3).map((link) => (
            <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer">
              {link.mark}
            </a>
          ))}
        </div>
      </nav>
      <div className="tpl-inner">
        <h1>{profile.displayName}</h1>
        <div className="tpl-hero-grid">
          <ul className="tpl-updates">
            {navItems(snapshot).slice(0, 3).map((item) => (
              <li key={item.href}>
                <a href={item.href}>
                  <span>{item.label}</span>
                  <b>↗</b>
                </a>
              </li>
            ))}
          </ul>
          <div className="tpl-hero-bio">
            {profile.tagline && <p>{profile.tagline}</p>}
            <a className="tpl-underline" href="#about">
              Ler a história completa
            </a>
          </div>
          {photo && (
            <div className="tpl-hero-portrait">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt="" fetchPriority="high" />
              <span className="tpl-badge">{profile.genres[0] ?? "Artist"}</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

/** 04 · Ember — framed page over a warm backdrop, asymmetric tiles. */
export function Hero04({ snapshot }: HeroProps) {
  const { profile, images } = snapshot;
  const photo = images.hero ?? images.portrait;
  return (
    <header className="tpl-hero tpl-hero-04" id="top">
      {photo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="tpl-hero-photo" src={photo.url} alt="" fetchPriority="high" />
      )}
      <span className="tpl-ghost-name" aria-hidden="true">
        {profile.displayName}
      </span>
      <div className="tpl-hero-top">
        <span className="tpl-wordmark">{profile.displayName}®</span>
        <nav className="tpl-pill-nav" aria-label="Secções da página">
          {navItems(snapshot).slice(0, 4).map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>
        <span className="tpl-edition">
          {[profile.city, profile.country].filter(Boolean).join(" / ").toUpperCase()}
        </span>
      </div>
      <div className="tpl-hero-copy">
        <h1>{profile.tagline ?? profile.displayName}</h1>
        <p>{profile.genres.join(" · ")}</p>
        <a className="tpl-cta" href="#booking">
          Book {profile.displayName} ↗
        </a>
      </div>
      <div className="tpl-hero-bottom">
        <div className="tpl-tiles">
          <div className="tpl-tile">
            <b>{profile.genres[0] ?? "Live"}</b>
            <span>O som de {profile.displayName}</span>
          </div>
          <div className="tpl-tile">
            <b>{profile.city ?? "Worldwide"}</b>
            <span>Clubes, festivais e colaborações</span>
          </div>
        </div>
        {images.portrait && (
          <aside className="tpl-artist-card">
            <span>● Disponível para bookings</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={images.portrait.url} alt="" loading="lazy" />
            <p>
              {profile.displayName}
              <br />
              {profile.genres[0] ?? "Artist"}
            </p>
            <a className="tpl-cta" href="#press">
              Press kit ↗
            </a>
          </aside>
        )}
      </div>
    </header>
  );
}

/** 05 · Portrait — one dominant photo behind a poster grid. */
export function Hero05({ snapshot }: HeroProps) {
  const { profile, images } = snapshot;
  const photo = images.portrait ?? images.hero;
  const actions = navItems(snapshot).slice(0, 4);

  return (
    <header className="tpl-hero tpl-hero-05" id="top">
      {photo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="tpl-portrait-bg" src={photo.url} alt="" fetchPriority="high" />
      )}
      <div className="tpl-shade" aria-hidden="true" />
      <div className="tpl-poster">
        <div className="tpl-cell tpl-cell-small">
          {[profile.city, new Date().getFullYear()].filter(Boolean).join(" / ")}
        </div>
        <div className="tpl-cell tpl-desktop" />
        <div className="tpl-cell tpl-cell-brand">{profile.displayName}®</div>
        <div className="tpl-cell tpl-desktop" />
        <div className="tpl-cell tpl-cell-small">{profile.genres[0] ?? "ARTIST"}</div>

        <div className="tpl-cell tpl-cell-copy">
          <p>{profile.tagline ?? profile.displayName}</p>
        </div>
        <div className="tpl-cell tpl-face" />
        <div className="tpl-cell tpl-face" />
        <div className="tpl-cell tpl-desktop" />
        <div className="tpl-cell tpl-cell-small tpl-desktop">{profile.genres.slice(0, 2).join(" / ")}</div>

        <div className="tpl-cell tpl-desktop" />
        {actions[0] && (
          <a className="tpl-cell tpl-cell-action" href={actions[0].href}>
            {actions[0].label.toLowerCase()}
            <span>↗</span>
          </a>
        )}
        <div className="tpl-cell tpl-face" />
        {actions[1] && (
          <a className="tpl-cell tpl-cell-action" href={actions[1].href}>
            {actions[1].label.toLowerCase()}
            <span>↗</span>
          </a>
        )}
        <div className="tpl-cell tpl-desktop" />

        {actions[2] && (
          <a className="tpl-cell tpl-cell-action" href={actions[2].href}>
            {actions[2].label.toLowerCase()}
            <span>↗</span>
          </a>
        )}
        <div className="tpl-cell tpl-face" />
        <div className="tpl-cell tpl-desktop" />
        <div className="tpl-cell tpl-cell-copy">
          <p>Para as noites de que te lembras.</p>
        </div>
        {actions[3] && (
          <a className="tpl-cell tpl-cell-action" href={actions[3].href}>
            {actions[3].label.toLowerCase()}
            <span>↗</span>
          </a>
        )}

        <div className="tpl-cell tpl-cell-footer">
          My Page
          <br />
          Powered by Muska
        </div>
        <div className="tpl-cell tpl-cell-name">{profile.displayName}.</div>
        <div className="tpl-cell tpl-desktop" />
        <a className="tpl-cell tpl-cell-action" href="#booking">
          booking<span>↗</span>
        </a>
        <div className="tpl-cell tpl-cell-footer">
          Portrait / 05
          <br />
          Explora a grelha ↗
        </div>
      </div>
    </header>
  );
}

export const HEROES = {
  "01": Hero01,
  "02": Hero02,
  "03": Hero03,
  "04": Hero04,
  "05": Hero05,
} as const;
