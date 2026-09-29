import type { CSSProperties, ReactNode } from "react";
import { snapshotContent, type PageSnapshot, type SectionId, type SnapshotContent } from "@/lib/page-model";
import { digitsOnly, youtubeId, youtubeThumbnail } from "@/lib/page-content";
import { pressCategoryLabel } from "@/lib/press";
import { DonateBlock } from "../shared/DonateBlock";
import { StoreBlock } from "../shared/StoreBlock";
import { IconSprite, iconFor } from "../t02/icons";
import { T01_MOTION, T02Bio, T02BookingForm, T02MenuButton, T02Motion } from "../t02/T02Client";
import {
  ORIGIN,
  Words,
  chaptersOf,
  external,
  hasContent,
  place,
  playerOf,
  splitDate,
  youtubeEmbed,
  type HandoffLinks,
} from "../handoff/common";
import "@/styles/template-01.css";

/**
 * Template 01 · versão 1 — from the Kevy handoff (kevy-v1-publicar.zip).
 *
 * "Mesmo motor, mesmo contrato de dados, outro desenho": the page runs on the
 * Template 02 engine (pop up, biography chapters, motion, booking page) with
 * the original Template 01 layout — photo hero with the logo in place of the
 * name, a featured player card, glass bar and ambient orbs. As with Template
 * 02, the handoff's markup is filled on the server from the published
 * snapshot, and the section order is the artist's.
 *
 * New in this handoff, and read from the content document:
 *   - `logoHero`: the hero logo when it differs from the bar's.
 *   - the nickname in quotes under the name.
 *   - YouTube videos inside the gallery, with a play button, in the pop up.
 *   - a year on each release.
 *   - "Etiquetas das secções sem número."
 *
 * Changed on purpose, as in Template 02: the booking form stores the request
 * in the Booking inbox (the static page only assembled a message), and the
 * footer credit follows the plan's branding entitlement.
 */

interface Props {
  snapshot: PageSnapshot;
  page: "home" | "booking";
  links: HandoffLinks;
}

function Head({ label, lines, note }: { label: string; lines: string[]; note?: string }) {
  return (
    <div className="section-head reveal">
      <div>
        <div className="eyebrow">{label}</div>
        <h2>
          <Words lines={lines} />
        </h2>
      </div>
      {note && <p>{note}</p>}
    </div>
  );
}

type Ctx = { snapshot: PageSnapshot; content: SnapshotContent; links: HandoffLinks };

const NAV_LABEL: Partial<Record<SectionId, string>> = {
  music: "Música",
  video: "Vídeos",
  biography: "História",
  highlights: "Palmarés",
  gallery: "Galeria",
  events: "Datas",
  press: "Press kit",
  booking: "Booking",
  donations: "Apoiar",
  store: "Loja",
};

const ANCHOR: Partial<Record<SectionId, string>> = {
  music: "listen",
  video: "videos",
  biography: "story",
  highlights: "destaques",
  gallery: "galeria",
  events: "events",
  press: "press",
  booking: "booking",
  donations: "apoiar",
  store: "loja",
};

// --- Sections --------------------------------------------------------------------

function Music({ snapshot, content }: Ctx) {
  const player = playerOf(snapshot);
  const artwork = snapshot.images.portrait ?? snapshot.images.hero;
  const others = snapshot.tracks.filter((track) => track !== player && (track.url || track.fileUrl));
  return (
    <section className="section" id="listen">
      <div className="shell">
        <Head
          label="Música"
          lines={["Carrega play.", "Fica por aqui."]}
          note="O perfil completo no player, e os lançamentos logo por baixo."
        />
        {player?.embed && (
          <article className="featured reveal">
            <div
              className="artwork mp-artwork"
              style={artwork ? { backgroundImage: `url("${artwork.url}")` } : undefined}
            />
            <div className="set-info">
              <div className="eyebrow">{player.platformLabel ?? "Player"}</div>
              <h3>{snapshot.profile.displayName}</h3>
              <div className="player-embed">
                <iframe
                  src={player.embed.src}
                  title={`${snapshot.profile.displayName} no ${player.platformLabel ?? "player"}`}
                  loading="lazy"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                />
              </div>
              {player.url && (
                <div className="set-controls">
                  <a href={player.url} {...external(player.url)}>
                    Abrir perfil completo ↗
                  </a>
                </div>
              )}
            </div>
          </article>
        )}
        {(content.discography.length > 0 || others.length > 0) && (
          <div className="mp-faixas reveal" data-mp-lista="">
            {content.discography.map((item, i) => (
              <Track key={`d${i}`} title={item.title} note={item.with} year={item.year} url={item.url} />
            ))}
            {others.map((track) => (
              <Track
                key={track.id}
                title={track.title}
                note={track.platformLabel}
                year={null}
                url={track.url ?? track.fileUrl}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function Track({
  title,
  note,
  year,
  url,
}: {
  title: string;
  note: string | null;
  year: string | null;
  url: string | null;
}) {
  const video = youtubeId(url);
  const caption = title + (note ? ` feat. ${note}` : "");
  const body = (
    <>
      <span className="n" />
      <span>
        <b>{title}</b> {note && <small>{note}</small>}
      </span>
      {year && <span className="mp-faixa-ano">{year}</span>}
      {url && <span className="abre">ver ↗</span>}
    </>
  );
  if (!url) return <div className="mp-faixa">{body}</div>;
  if (video) {
    return (
      <a
        className="mp-faixa"
        href={url}
        data-mp-lightbox="video"
        data-mp-lightbox-src={youtubeEmbed(video)}
        data-mp-lightbox-legenda={caption}
      >
        {body}
      </a>
    );
  }
  return (
    <a className="mp-faixa" href={url} {...external(url)}>
      {body}
    </a>
  );
}

function Videos({ snapshot }: Ctx) {
  return (
    <section className="section" id="videos">
      <div className="shell">
        <Head label="Vídeos" lines={["Vê o set."]} note="Abre aqui mesmo, sem sair da página." />
        <div className="mp-videos-01" data-mp-lista="">
          {snapshot.videos.map((video) => {
            const id = youtubeId(video.embed?.src ?? video.url);
            const poster = video.poster ?? (id ? youtubeThumbnail(id) : null);
            const embed = video.embed?.src ?? null;
            return (
              <article className="video-card" key={video.id}>
                <a
                  className="video-frame"
                  href={video.url ?? video.fileUrl ?? "#"}
                  {...(embed
                    ? { "data-mp-lightbox": "video", "data-mp-lightbox-src": embed, "data-mp-lightbox-legenda": video.title }
                    : external(video.url ?? video.fileUrl))}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {poster && <img src={poster} alt="" loading="lazy" />}
                  <span className="video-play">▶</span>
                </a>
                <h3>{video.title}</h3>
                <small>{video.platform === "youtube" ? "YouTube" : (video.platform ?? "")}</small>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Story({ snapshot, content }: Ctx) {
  return (
    <section className="section" id="story">
      <div className="shell">
        <Head label="História" lines={["Por trás", "da cabine."]} />
        <T02Bio chapters={chaptersOf(snapshot, content)} stats={content.stats} />
      </div>
    </section>
  );
}

function Highlights({ snapshot, content }: Ctx) {
  const background = snapshot.images.hero ?? snapshot.images.portrait;
  return (
    <section className="section mp-palmares" id="destaques">
      {background && (
        <div
          className="mp-palmares-fundo"
          data-mp-paralaxe=".16"
          aria-hidden="true"
          style={{ backgroundImage: `url("${background.url}")` }}
        />
      )}
      <div className="shell">
        <Head label="Palmarés" lines={["O caminho", "até aqui."]} />
        <div className="mp-palmares-grelha" data-mp-lista="">
          {content.highlights.map((item, i) => (
            <article
              className="mp-conquista"
              key={i}
              {...(item.image ? { "data-com-imagem": "" } : {})}
              {...(item.videoId
                ? {
                    "data-mp-lightbox": "video",
                    "data-mp-lightbox-src": youtubeEmbed(item.videoId),
                    "data-mp-lightbox-legenda": item.title,
                    tabIndex: 0,
                    role: "button",
                  }
                : {})}
            >
              <span
                className="mp-conquista-img"
                aria-hidden="true"
                style={item.image ? { backgroundImage: `url("${item.image}")` } : undefined}
              />
              <span className="mp-conquista-topo">
                {item.type && <span className="mp-chip">{item.type}</span>}
                {item.year && <span className="mp-chip mp-chip-ano">{item.year}</span>}
              </span>
              <b>{item.title}</b>
              {item.detail && <span className="mp-conquista-detalhe">{item.detail}</span>}
              <span className="mp-conquista-ver">Ver vídeo ▶</span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Gallery({ content }: Ctx) {
  return (
    <section className="section" id="galeria">
      <div className="shell">
        <Head label="Galeria" lines={["Em palco."]} />
        <div className="mp-galeria" data-mp-lista="">
          {content.gallery.map((item, i) => {
            const caption = [item.caption, item.credit && `Foto: ${item.credit}`].filter(Boolean).join(" · ");
            return (
              <figure
                className="mp-foto"
                key={i}
                tabIndex={0}
                data-mp-lightbox={item.videoId ? "video" : "imagem"}
                data-mp-lightbox-src={item.videoId ? youtubeEmbed(item.videoId) : item.image.url}
                data-mp-lightbox-legenda={caption}
                data-mp-lightbox-download={item.downloadUrl ?? undefined}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.image.url}
                  alt={item.caption ?? item.image.alt}
                  width={item.image.width ?? undefined}
                  height={item.image.height ?? undefined}
                  loading="lazy"
                />
                <span className="mp-foto-play" aria-hidden="true">
                  ▶
                </span>
                {caption && <figcaption>{caption}</figcaption>}
              </figure>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Dates({ snapshot }: Ctx) {
  return (
    <section className="section" id="events">
      <div className="shell">
        <Head label="Próximas datas" lines={["Encontra-me", "na pista."]} />
        <div className="events reveal" data-mp-lista="">
          {snapshot.events.map((event) => {
            const { day, month } = splitDate(event.startsAt, event.timezone);
            return (
              <article className="event" key={event.id}>
                <time className="date" dateTime={event.startsAt}>
                  <strong>{day}</strong>
                  <small>{month}</small>
                </time>
                <div>
                  <h3>{event.title}</h3>
                  {event.venue && <span className="place">{event.venue}</span>}
                </div>
                <span className="city">{event.city ?? ""}</span>
                {event.ticketsUrl ? (
                  <a className="pill event-action" href={event.ticketsUrl} {...external(event.ticketsUrl)}>
                    Bilhetes
                  </a>
                ) : (
                  <span />
                )}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Download({ href, icon, title, detail, download }: { href: string; icon: string; title: string; detail: string; download?: boolean }) {
  return (
    <a className="mp-descarga" href={href} {...(download ? { download: true } : external(href))}>
      <i>{icon}</i>
      <div>
        <b>{title}</b>
        <small>{detail}</small>
      </div>
    </a>
  );
}

function Press({ snapshot, content, links }: Ctx) {
  const { documents } = content;
  const folders = snapshot.press.links.filter((link) => link.url !== documents.folder);
  return (
    <section className="section" id="press">
      <div className="shell">
        <Head label="Press kit" lines={["Para promotores", "e imprensa."]} />
        <div className="mp-press-01">
          {documents.presskit && (
            <Download href={documents.presskit} icon="↓" title="Press kit em PDF" detail="Biografia, música e palmarés" download />
          )}
          {documents.rider && (
            <Download href={documents.rider} icon="↓" title="Rider em PDF" detail="Técnico e hospitalidade" download />
          )}
          {documents.folder && (
            <Download href={documents.folder} icon="↗" title="Pasta completa" detail="Fotografias, logótipos e vídeos" />
          )}
          {folders.map((link) => (
            <Download key={link.category} href={link.url} icon="↗" title={pressCategoryLabel(link.category)} detail="Pasta partilhada" />
          ))}
          {links.booking && (
            <a className="mp-descarga" href={links.booking}>
              <i>→</i>
              <div>
                <b>{content.rider ? "Booking e rider" : "Booking"}</b>
                <small>{content.rider ? "Pedido, equipamento e condições" : "Pedido de datas e condições"}</small>
              </div>
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

function Booking({ content, links }: Ctx) {
  const contact = content.bookingContact;
  const number = digitsOnly(contact?.phone);
  return (
    <section className="section" id="booking">
      <div className="shell">
        <div className="booking reveal">
          <div>
            <div className="eyebrow">{contact?.name ? `Booking · ${contact.name}` : "Booking"}</div>
            <h2>
              <Words lines={["Leva esta energia", "ao teu próximo evento."]} />
            </h2>
          </div>
          <div className="booking-row">
            <p>Disponível para clubes, festivais, eventos privados e parcerias de marca selecionadas.</p>
            <div className="booking-actions">
              {contact?.whatsapp && number && (
                <a className="pill" href={`https://wa.me/${number}`} target="_blank" rel="noopener noreferrer">
                  WhatsApp ↗
                </a>
              )}
              {contact?.phone && (
                <a className="pill" href={`tel:+${number}`}>
                  {contact.phone}
                </a>
              )}
              {contact?.email && (
                <a className="pill" href={`mailto:${contact.email}`}>
                  {contact.email}
                </a>
              )}
              {links.booking && (
                <a className="pill primary" href={links.booking}>
                  Enviar pedido →
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Donations({ snapshot }: Ctx) {
  return (
    <section className="section mp-bloco-partilhado" id="apoiar">
      <div className="shell">
        <Head label="Apoiar" lines={["Faz parte."]} />
        <DonateBlock campaign={snapshot.campaign!} />
      </div>
    </section>
  );
}

function Store({ snapshot }: Ctx) {
  return (
    <section className="section mp-bloco-partilhado" id="loja">
      <div className="shell">
        <Head label="Loja" lines={["Leva contigo."]} />
        <StoreBlock products={snapshot.products} slug={snapshot.slug} />
      </div>
    </section>
  );
}

const SECTIONS: Partial<Record<SectionId, (ctx: Ctx) => ReactNode>> = {
  music: Music,
  video: Videos,
  biography: Story,
  highlights: Highlights,
  gallery: Gallery,
  events: Dates,
  press: Press,
  booking: Booking,
  donations: Donations,
  store: Store,
};

// --- Shell -------------------------------------------------------------------------

/** "Onde existe logótipo, o nome em texto sai" — kept for screen readers. */
function Brand({ snapshot }: { snapshot: PageSnapshot }) {
  const logo = snapshot.images.logo;
  return logo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="mp-logo" src={logo.url} alt={snapshot.profile.displayName} />
  ) : (
    <span>{snapshot.profile.displayName}</span>
  );
}

function Backdrop() {
  return (
    <>
      <div className="noise" aria-hidden="true" />
      <div className="ambient" aria-hidden="true">
        <span className="orb a" />
        <span className="orb b" />
      </div>
    </>
  );
}

function Footer({ snapshot, children }: { snapshot: PageSnapshot; children: ReactNode }) {
  return (
    <footer className="footer">
      <div className="shell footer-row">
        <b className="mp-footer-nome">
          <Brand snapshot={snapshot} />
        </b>
        <span className="footer-links">{children}</span>
        {snapshot.branding.showMyPageBadge && (
          <a className="mp-powered" href={ORIGIN} target="_blank" rel="noopener">
            <span>Powered by</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/muska-logo.png" alt="Muska" width={92} height={19} />
          </a>
        )}
      </div>
    </footer>
  );
}

export function Template01({ snapshot, page, links }: Props) {
  const content = snapshotContent(snapshot);
  const { appearance, profile } = snapshot;

  const style = {
    "--mp-fundo": appearance.background,
    "--mp-texto": appearance.text,
    "--mp-destaque": appearance.accent,
    "--mp-destaque-texto": appearance.accentText,
  } as CSSProperties;

  const shell = {
    className: "t01",
    style,
    "data-template": "01",
    "data-artist": profile.displayName,
    "data-slug": snapshot.slug,
  };

  if (page === "booking") return <BookingPage snapshot={snapshot} content={content} links={links} shell={shell} />;

  const base = { snapshot, content, links };
  const visible = snapshot.sections
    .filter((section) => section.enabled && section.id !== "hero")
    .sort((a, b) => a.position - b.position)
    .filter((section) => SECTIONS[section.id] && hasContent(section.id, base))
    .map((section) => section.id);

  const heroPhoto = snapshot.images.portrait ?? snapshot.images.hero;
  const heroLogo = content.logoHero ?? snapshot.images.logo;
  // Template 01 lists every network in the hero column, as the handoff does.
  const heroLinks = snapshot.links;
  const bookable = snapshot.booking.enabled || Boolean(content.bookingContact);
  const bookingHref = links.booking ?? "#booking";
  const navLinks = visible.map((id) => ({ href: `#${ANCHOR[id]}`, label: NAV_LABEL[id]! }));
  const kicker = place([content.roleLine ?? "Artista", place([profile.city, profile.country], ", ")]);

  return (
    <div {...shell}>
      <IconSprite />
      <Backdrop />
      <nav className="nav">
        <a className="wordmark" href="#top">
          <Brand snapshot={snapshot} />
        </a>
        <div className="links">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </div>
        <div className="nav-actions">
          {bookable && (
            <a className="pill primary" href={bookingHref}>
              Booking
            </a>
          )}
          <T02MenuButton panel={navLinks} />
        </div>
      </nav>

      <main id="top">
        <section className="hero">
          <div className="hero-media">
            {heroPhoto && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={heroPhoto.url} alt="" data-mp-paralaxe=".08" fetchPriority="high" />
            )}
          </div>
          <div className="shell hero-content">
            <div>
              <div className="kicker">{kicker}</div>
              <h1 className="mp-h1" data-length={!heroLogo && profile.displayName.length > 9 ? "long" : undefined}>
                {heroLogo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="mp-logo-hero" src={heroLogo.url} alt="" />
                )}
                <span className={heroLogo ? "mp-oculto" : undefined}>{profile.displayName}</span>
              </h1>
              {content.nickname && <div className="mp-alcunha">“{content.nickname}”</div>}
              {profile.genres.length > 0 && <div className="genres">{profile.genres.join(" · ")}</div>}
              {profile.tagline && <div className="location">{profile.tagline}</div>}
              <div className="hero-buttons">
                {visible.includes("music") && (
                  <a className="pill primary" href="#listen">
                    ▶ Ouvir agora
                  </a>
                )}
                {bookable && (
                  <a className="pill" href={bookingHref}>
                    Pedir booking
                  </a>
                )}
              </div>
            </div>
            {heroLinks.length > 0 && (
              <nav className="hero-social" aria-label="Redes e plataformas">
                {heroLinks.map((link) => (
                  <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer">
                    <span>{link.label}</span>
                    <svg width="13" height="13" aria-hidden="true">
                      <use href={iconFor(link.platform)} />
                    </svg>
                  </a>
                ))}
              </nav>
            )}
          </div>
          <div className="scroll-hint" aria-hidden="true">
            DESCE PARA EXPLORAR
          </div>
        </section>

        {visible.map((id) => {
          const Section = SECTIONS[id]!;
          return <Section key={id} {...base} />;
        })}
      </main>

      <Footer snapshot={snapshot}>
        {snapshot.links.map((link) => (
          <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer">
            {link.label}
          </a>
        ))}
      </Footer>
      <T02Motion selectors={T01_MOTION} />
    </div>
  );
}

// --- Booking page --------------------------------------------------------------------

function BookingPage({
  snapshot,
  content,
  links,
  shell,
}: {
  snapshot: PageSnapshot;
  content: SnapshotContent;
  links: HandoffLinks;
  shell: Record<string, unknown>;
}) {
  const { rider, bookingContact, documents } = content;
  const whatsapp = bookingContact?.whatsapp ? digitsOnly(bookingContact.phone) : "";
  const navLinks = [
    { href: links.home, label: "Voltar à página" },
    { href: "#pedido", label: "Pedido" },
    ...(rider && rider.technical.length > 0 ? [{ href: "#rider", label: "Rider técnico" }] : []),
    ...(rider && rider.hospitality.length > 0 ? [{ href: "#hospitalidade", label: "Hospitalidade" }] : []),
  ];

  return (
    <div {...shell}>
      <Backdrop />
      <nav className="nav">
        <a className="wordmark" href={links.home}>
          <Brand snapshot={snapshot} />
        </a>
        <div className="links">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </div>
        <div className="nav-actions">
          {whatsapp && (
            <a className="pill primary" href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer">
              WhatsApp ↗
            </a>
          )}
          <T02MenuButton panel={navLinks} />
        </div>
      </nav>

      <main id="top" className="mp-pagina-interior">
        <section className="section" id="pedido">
          <div className="shell">
            <Head label="Pedido" lines={["Reservar", `${snapshot.profile.displayName}.`]} />
            <div className="mp-grelha duas reveal">
              <div>
                <p className="player-note">
                  Preenche os campos e escolhe como queres a resposta: WhatsApp, com o teu número, ou email. O pedido
                  chega à equipa do artista. Um pedido não é uma reserva confirmada.
                </p>
                <T02BookingForm
                  slug={snapshot.slug}
                  artistName={snapshot.profile.displayName}
                  whatsapp={whatsapp || null}
                  enabled={snapshot.booking.enabled}
                  askChannel
                  primaryClass="pill primary"
                  secondaryClass="pill"
                />
              </div>
              <div>
                {bookingContact && (
                  <div className="mp-rider-lista" style={{ display: "grid", gap: 10 }}>
                    <div className="mp-descarga" style={{ cursor: "default" }}>
                      <div>
                        <small style={{ letterSpacing: ".14em", textTransform: "uppercase", fontSize: 10 }}>
                          Contacto de booking
                        </small>
                        <b>{place([bookingContact.name ?? "Booking", bookingContact.role])}</b>
                        {bookingContact.phone && (
                          <a
                            href={`tel:+${digitsOnly(bookingContact.phone)}`}
                            style={{ color: "inherit", fontSize: 13, opacity: 0.75 }}
                          >
                            {bookingContact.phone}
                          </a>
                        )}
                        {bookingContact.email && (
                          <a href={`mailto:${bookingContact.email}`} style={{ color: "inherit", fontSize: 13, opacity: 0.75 }}>
                            {bookingContact.email}
                          </a>
                        )}
                      </div>
                    </div>
                    {whatsapp && (
                      <Download href={`https://wa.me/${whatsapp}`} icon="↗" title="WhatsApp" detail="Resposta mais rápida" />
                    )}
                  </div>
                )}
                {(documents.rider || documents.presskit || documents.folder) && (
                  <div className="mp-descargas">
                    {documents.rider && (
                      <Download href={documents.rider} icon="↓" title="Rider em PDF" detail="Técnico e hospitalidade" download />
                    )}
                    {documents.presskit && (
                      <Download
                        href={documents.presskit}
                        icon="↓"
                        title="Press kit em PDF"
                        detail="Biografia, música e palmarés"
                        download
                      />
                    )}
                    {documents.folder && (
                      <Download href={documents.folder} icon="↗" title="Pasta completa" detail="Fotografias, logótipos e vídeos" />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {rider && rider.technical.length > 0 && (
          <section className="section" id="rider">
            <div className="shell">
              <Head label="Rider técnico" lines={["O que tem", "de estar em cabine."]} />
              <div className="mp-grelha duas reveal">
                <div>
                  <ul className="mp-rider-lista">
                    {rider.technical.map((line, i) => (
                      <li key={i}>
                        <b>{line.qty}</b>
                        <span>{line.item}</span>
                      </li>
                    ))}
                  </ul>
                  {rider.notes.length > 0 && (
                    <ul className="mp-notas">
                      {rider.notes.map((note, i) => (
                        <li key={i}>{note}</li>
                      ))}
                    </ul>
                  )}
                </div>
                {rider.diagram && (
                  <figure style={{ margin: 0 }}>
                    <button
                      className="mp-esquema"
                      type="button"
                      data-mp-lightbox="imagem"
                      data-mp-lightbox-src={rider.diagram.url}
                      data-mp-lightbox-legenda={rider.diagramCaption ?? "Diagrama do equipamento"}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={rider.diagram.url} alt={rider.diagramCaption ?? "Diagrama do equipamento"} />
                    </button>
                    {rider.diagramCaption && (
                      <figcaption className="player-note" style={{ marginTop: 12 }}>
                        {rider.diagramCaption}
                      </figcaption>
                    )}
                  </figure>
                )}
              </div>
            </div>
          </section>
        )}

        {rider && rider.hospitality.length > 0 && (
          <section className="section" id="hospitalidade">
            <div className="shell">
              <Head label="Hospitalidade" lines={["Camarim", "e convidados."]} />
              <div className="mp-grelha duas reveal">
                <ul className="mp-rider-lista">
                  {rider.hospitality.map((line, i) => (
                    <li key={i}>
                      <b>{line.qty}</b>
                      <span>{line.item}</span>
                    </li>
                  ))}
                </ul>
                <div>
                  {rider.guestTickets && (
                    <div className="mp-destaque-cartao">
                      <b>Bilhetes para convidados</b>
                      <span>{rider.guestTickets}</span>
                    </div>
                  )}
                  {rider.notices.length > 0 && (
                    <div className="mp-aviso">
                      <ul className="mp-notas" style={{ margin: 0 }}>
                        {rider.notices.map((notice, i) => (
                          <li key={i}>{notice}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer snapshot={snapshot}>
        <a href={links.home}>Voltar à página</a>
      </Footer>
      <T02Motion selectors={T01_MOTION} />
    </div>
  );
}
