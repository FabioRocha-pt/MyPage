import type { CSSProperties, ReactNode } from "react";
import { snapshotContent, type PageSnapshot, type SectionId, type SnapshotContent } from "@/lib/page-model";
import { digitsOnly, youtubeId, youtubeThumbnail } from "@/lib/page-content";
import { pressCategoryLabel } from "@/lib/press";
import { DonateBlock } from "../shared/DonateBlock";
import { StoreBlock } from "../shared/StoreBlock";
import { IconSprite, iconFor } from "./icons";
import "@/styles/template-02.css";
import { T02Bio, T02BookingForm, T02MenuButton, T02Motion } from "./T02Client";
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

export type T02Links = HandoffLinks;

/**
 * Template 02 · versão 1 — from the Deekay handoff (deekay-v1-publicar.zip).
 *
 * The handoff's `index.html` and `booking.html` filled a fixed template from a
 * JSON file on the client. This is the same markup, filled on the server from
 * the published snapshot, so the page is complete before any script runs and
 * the draft/publish rules of the rest of the platform apply unchanged.
 *
 * Kept from the handoff:
 *   - "A secção aparece se o caminho com o mesmo nome tiver conteúdo." An empty
 *     section is not rendered, and hidden sections do not use up a number in
 *     the "01 / HISTÓRIA" labels.
 *   - "Onde existe logótipo, o nome em texto sai" — but stays for screen
 *     readers and search engines.
 *   - External links open in a new tab; YouTube opens in the pop up.
 *
 * Changed on purpose:
 *   - Section order follows the artist's order from the editor, instead of the
 *     handoff's fixed order, like every other template.
 *   - The booking form stores the request (Booking inbox) before offering
 *     WhatsApp; the static page could only open WhatsApp.
 *   - The footer credit follows the plan's branding entitlement.
 */

interface Props {
  snapshot: PageSnapshot;
  page: "home" | "booking";
  links: T02Links;
}

function Head({ number, label, lines }: { number: string | null; label: string; lines: string[] }) {
  return (
    <div className="head reveal">
      <div className="label">{number ? `${number} / ${label}` : label}</div>
      <h2>
        <Words lines={lines} />
      </h2>
    </div>
  );
}

// --- Sections --------------------------------------------------------------------

type Ctx = {
  snapshot: PageSnapshot;
  content: SnapshotContent;
  links: T02Links;
  number: string | null;
};

const NAV_LABEL: Partial<Record<SectionId, string>> = {
  biography: "História",
  music: "Música",
  video: "Vídeos",
  gallery: "Galeria",
  highlights: "Palmarés",
  events: "Datas",
  press: "Press kit",
  booking: "Booking",
  donations: "Apoiar",
  store: "Loja",
};

const ANCHOR: Partial<Record<SectionId, string>> = {
  biography: "story",
  music: "music",
  video: "videos",
  gallery: "galeria",
  highlights: "destaques",
  events: "dates",
  press: "press",
  booking: "booking",
  donations: "apoiar",
  store: "loja",
};

function Story({ snapshot, content, number }: Ctx) {
  return (
    <section className="section" id="story">
      <div className="shell">
        <Head number={number} label="HISTÓRIA" lines={["Feito para", "mover."]} />
        <T02Bio chapters={chaptersOf(snapshot, content)} stats={content.stats} />
      </div>
    </section>
  );
}

function Music({ snapshot, content, number }: Ctx) {
  const player = playerOf(snapshot);
  const others = snapshot.tracks.filter((track) => track !== player && (track.url || track.fileUrl));
  return (
    <section className="section" id="music">
      <div className="shell">
        <Head number={number} label="MÚSICA" lines={["Ouve agora."]} />
        {player?.embed && (
          <div className="player-embed reveal">
            <iframe
              src={player.embed.src}
              title={`${snapshot.profile.displayName} no ${player.platformLabel ?? "player"}`}
              loading="lazy"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            />
          </div>
        )}
        {player?.url && (
          <p className="player-note reveal">
            <a href={player.url} {...external(player.url)}>
              Abrir perfil completo no {player.platformLabel ?? "player"} ↗
            </a>
          </p>
        )}
        {(content.discography.length > 0 || others.length > 0) && (
          <div className="mp-faixas reveal" data-mp-lista="">
            {content.discography.map((item, i) => (
              <Track key={`d${i}`} title={item.title} note={item.with} url={item.url} />
            ))}
            {others.map((track) => (
              <Track key={track.id} title={track.title} note={track.platformLabel} url={track.url ?? track.fileUrl} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function Track({ title, note, url }: { title: string; note: string | null; url: string | null }) {
  const video = youtubeId(url);
  const caption = title + (note ? ` feat. ${note}` : "");
  const body = (
    <>
      <span className="n" />
      <span>
        <b>{title}</b> {note && <small>{note}</small>}
      </span>
      <span className="abre">ver ↗</span>
    </>
  );
  if (!url) return <a className="mp-faixa">{body}</a>;
  if (video) {
    return (
      <a
        className="mp-faixa"
        href={url}
        data-mp-lightbox="video"
        data-mp-lightbox-src={`https://www.youtube-nocookie.com/embed/${video}`}
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

function Videos({ snapshot, number }: Ctx) {
  return (
    <section className="section" id="videos">
      <div className="shell">
        <Head number={number} label="VÍDEOS" lines={["Vê e ouve."]} />
        <div className="video-grid reveal" data-mp-lista="">
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

function Gallery({ content, number }: Ctx) {
  return (
    <section className="section" id="galeria">
      <div className="shell">
        <Head number={number} label="GALERIA" lines={["Em palco."]} />
        <div className="mp-galeria reveal" data-mp-lista="">
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
                {item.videoId && (
                  <span className="mp-foto-play" aria-hidden="true">
                    ▶
                  </span>
                )}
                {caption && <figcaption>{caption}</figcaption>}
              </figure>
            );
          })}
        </div>
        <p className="player-note reveal">Clica numa fotografia para a ver em grande.</p>
      </div>
    </section>
  );
}

function Highlights({ snapshot, content, number }: Ctx) {
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
        <Head number={number} label="PALMARÉS" lines={["O que já", "aconteceu."]} />
        <div className="mp-palmares-grelha" data-mp-lista="">
          {content.highlights.map((item, i) => (
            <article
              className="mp-conquista"
              key={i}
              {...(item.image ? { "data-com-imagem": "" } : {})}
              {...(item.videoId
                ? {
                    "data-mp-lightbox": "video",
                    "data-mp-lightbox-src": `https://www.youtube-nocookie.com/embed/${item.videoId}`,
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

function Dates({ snapshot, number }: Ctx) {
  return (
    <section className="section" id="dates">
      <div className="shell">
        <Head number={number} label="AO VIVO" lines={["Próximas datas."]} />
        <div className="events reveal">
          {snapshot.events.map((event) => {
            const { day, month } = splitDate(event.startsAt, event.timezone);
            return (
              <article className="event" key={event.id}>
                <time dateTime={event.startsAt}>
                  <span>{day}</span> <small>{month}</small>
                </time>
                <div>
                  <h3>{event.title}</h3>
                  {event.description && <p>{event.description}</p>}
                </div>
                <span className="venue">{place([event.venue, event.city])}</span>
                {event.ticketsUrl ? (
                  <a className="button event-button" href={event.ticketsUrl} {...external(event.ticketsUrl)}>
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

function Press({ snapshot, content, links }: Ctx) {
  const { documents } = content;
  // Shared folders other than the main one keep their own tile, so nothing the
  // press kit publishes disappears in this template.
  const folders = snapshot.press.links.filter((link) => link.url !== documents.folder);
  return (
    <section className="section" id="press">
      <div className="shell presskit reveal">
        <div className="press-copy">
          <h2>
            <Words lines={["PRESS", "KIT."]} />
          </h2>
          <div>
            <p>Tudo o que promotores, salas e parceiros precisam, num só lugar.</p>
            {documents.folder && (
              <a className="button" style={{ color: "inherit", borderColor: "currentColor" }} href={documents.folder} {...external(documents.folder)}>
                Abrir press kit ↗
              </a>
            )}
          </div>
        </div>
        <div className="assets">
          {documents.presskit && (
            <a className="asset" href={documents.presskit} download>
              <i>↓</i>
              <div>
                <b>Press kit</b>
                <small>Biografia, música, palmarés, galeria e rider, em PDF</small>
              </div>
            </a>
          )}
          {documents.rider && (
            <a className="asset" href={documents.rider} download>
              <i>↓</i>
              <div>
                <b>Rider</b>
                <small>Técnico e de hospitalidade, em PDF</small>
              </div>
            </a>
          )}
          {content.rider && links.booking && (
            <a className="asset" href={`${links.booking}#rider`}>
              <i>→</i>
              <div>
                <b>Rider em página</b>
                <small>Equipamento, esquema e condições</small>
              </div>
            </a>
          )}
          {content.gallery.length > 0 && (
            <a className="asset" href="#galeria">
              <i>↗</i>
              <div>
                <b>Fotografias</b>
                <small>Imagens de palco e de promoção</small>
              </div>
            </a>
          )}
          {documents.folder && (
            <a className="asset" href={documents.folder} {...external(documents.folder)}>
              <i>↗</i>
              <div>
                <b>Pasta completa</b>
                <small>Fotografias, logótipos e vídeos</small>
              </div>
            </a>
          )}
          {folders.map((link) => (
            <a className="asset" key={link.category} href={link.url} {...external(link.url)}>
              <i>↗</i>
              <div>
                <b>{pressCategoryLabel(link.category)}</b>
                <small>Pasta partilhada</small>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function ContactActions({ content }: { content: SnapshotContent }) {
  const contact = content.bookingContact;
  if (!contact) return null;
  const number = digitsOnly(contact.phone);
  return (
    <>
      {contact.whatsapp && number && (
        <a className="button hot" href={`https://wa.me/${number}`} target="_blank" rel="noopener noreferrer">
          WhatsApp ↗
        </a>
      )}
      {contact.name && <span className="booking-quem">{place([contact.name, contact.role])}</span>}
      {contact.phone && (
        <a className="button" style={{ borderColor: "currentColor" }} href={`tel:+${number}`}>
          {contact.phone}
        </a>
      )}
      {contact.email && (
        <a className="button" style={{ borderColor: "currentColor" }} href={`mailto:${contact.email}`}>
          {contact.email}
        </a>
      )}
    </>
  );
}

function Booking({ content, links }: Ctx) {
  const name = content.bookingContact?.name;
  return (
    <section className="booking" id="booking">
      <div className="reveal">
        <div className="label">{name ? `Booking · ${name}` : "Booking"}</div>
        <h2>
          <Words lines={["VAMOS", "MOVER."]} />
        </h2>
        <p>Disponível para clubes, festivais, eventos culturais, experiências privadas e parcerias de marca selecionadas.</p>
        <div className="booking-actions">
          <ContactActions content={content} />
          {links.booking && (
            <a className="button" style={{ borderColor: "currentColor" }} href={links.booking}>
              {content.rider ? "Enviar pedido e ver rider →" : "Enviar pedido →"}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

function Donations({ snapshot, number }: Ctx) {
  return (
    <section className="section mp-bloco-partilhado" id="apoiar">
      <div className="shell">
        <Head number={number} label="APOIAR" lines={["Faz parte."]} />
        <DonateBlock campaign={snapshot.campaign!} />
      </div>
    </section>
  );
}

function Store({ snapshot, number }: Ctx) {
  return (
    <section className="section mp-bloco-partilhado" id="loja">
      <div className="shell">
        <Head number={number} label="LOJA" lines={["Leva contigo."]} />
        <StoreBlock products={snapshot.products} slug={snapshot.slug} />
      </div>
    </section>
  );
}

const SECTIONS: Partial<Record<SectionId, (ctx: Ctx) => ReactNode>> = {
  biography: Story,
  music: Music,
  video: Videos,
  gallery: Gallery,
  highlights: Highlights,
  events: Dates,
  press: Press,
  booking: Booking,
  donations: Donations,
  store: Store,
};

/** Sections without a numbered label: they carry their own title treatment. */
const UNNUMBERED = new Set<SectionId>(["press", "booking"]);

// --- Shell -------------------------------------------------------------------------

function Brand({ snapshot }: { snapshot: PageSnapshot }) {
  const logo = snapshot.images.logo;
  return logo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="mp-logo" src={logo.url} alt={snapshot.profile.displayName} />
  ) : (
    <span>{snapshot.profile.displayName}</span>
  );
}

function Footer({ snapshot, children }: { snapshot: PageSnapshot; children: ReactNode }) {
  return (
    <footer className="footer">
      <div className="shell footer-row">
        <b>
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

export function Template02({ snapshot, page, links }: Props) {
  const content = snapshotContent(snapshot);
  const { appearance, profile } = snapshot;

  const style = {
    "--mp-fundo": appearance.background,
    "--mp-texto": appearance.text,
    "--mp-destaque": appearance.accent,
    "--mp-destaque-texto": appearance.accentText,
  } as CSSProperties;

  const shell = {
    className: "t02",
    style,
    "data-template": "02",
    "data-artist": profile.displayName,
    "data-slug": snapshot.slug,
  };

  if (page === "booking") return <BookingPage snapshot={snapshot} content={content} links={links} shell={shell} />;

  const base = { snapshot, content, links };
  let counter = 0;
  const visible = snapshot.sections
    .filter((section) => section.enabled && section.id !== "hero")
    .sort((a, b) => a.position - b.position)
    .filter((section) => SECTIONS[section.id] && hasContent(section.id, base))
    .map((section) => ({
      id: section.id,
      number: UNNUMBERED.has(section.id) ? null : String(++counter).padStart(2, "0"),
    }));

  const heroPhoto = snapshot.images.portrait ?? snapshot.images.hero;
  const glass = snapshot.images.hero ?? snapshot.images.portrait;
  const heroLinks = snapshot.links.filter((link) => link.placement === "hero" || link.placement === "both");
  const genres = profile.genres;
  // Each half of the ticker must be at least as wide as the screen, or its end
  // shows before the loop restarts. The handoff repeated the list in the
  // browser; repeating it here to a safe minimum gives the same result.
  const tickerItems = genres.length ? Array.from({ length: Math.ceil(12 / genres.length) }, () => genres).flat() : [];
  const bookingHref = links.booking ?? "#booking";

  return (
    <div {...shell}>
      <IconSprite />
      <nav className="nav">
        <a className="logo" href="#top">
          <Brand snapshot={snapshot} />
        </a>
        <div className="nav-links" id="t02-menu">
          {visible.map((section) => (
            <a key={section.id} href={`#${ANCHOR[section.id]}`}>
              {NAV_LABEL[section.id]}
            </a>
          ))}
        </div>
        <div className="nav-actions">
          {(snapshot.booking.enabled || content.bookingContact) && (
            <a className="button hot" href={bookingHref}>
              Booking
            </a>
          )}
          <T02MenuButton />
        </div>
      </nav>

      <main id="top">
        <section className="hero">
          <div className="hero-image">
            {heroPhoto && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={heroPhoto.url} alt="" data-mp-paralaxe=".08" fetchPriority="high" />
            )}
            <span className="vertical">{place([profile.city, profile.country])}</span>
          </div>
          <div className="hero-copy">
            <div
              className="mp-hero-vidro"
              aria-hidden="true"
              style={glass ? { backgroundImage: `url("${glass.url}")` } : undefined}
            />
            <div className="mp-hero-tinta" aria-hidden="true" />
            <div className="hero-meta">
              <span>{content.roleLine ?? "Artista"}</span>
              <span>{genres.join(" · ")}</span>
            </div>
            <h1 className="mp-hero-nome" data-length={profile.displayName.length > 12 ? "long" : undefined}>
              {snapshot.images.logo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="mp-logo-hero" src={snapshot.images.logo.url} alt="" />
              )}
              <span className={snapshot.images.logo ? "mp-oculto" : undefined}>{profile.displayName}</span>
            </h1>
            <div className="hero-tag">
              <div className="mp-hero-texto">
                {profile.tagline && <p>{profile.tagline}</p>}
                {heroLinks.length > 0 && (
                  <nav className="mp-sociais" aria-label="Redes e plataformas">
                    {heroLinks.map((link) => (
                      <a
                        className="mp-social"
                        key={link.url}
                        href={link.url}
                        aria-label={link.label}
                        title={link.label}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <svg aria-hidden="true">
                          <use href={iconFor(link.platform)} />
                        </svg>
                      </a>
                    ))}
                  </nav>
                )}
              </div>
              {visible.some((section) => section.id === "music") && (
                <div className="mp-vinil-caixa">
                  <a className="mp-vinil" href="#music" aria-label="Ouvir a música">
                    <span className="mp-vinil-disco">
                      <span className="mp-vinil-rotulo">
                        {(content.logoDark ?? snapshot.images.logo) && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={(content.logoDark ?? snapshot.images.logo)!.url} alt="" />
                        )}
                      </span>
                    </span>
                    <span className="mp-vinil-brilho" />
                    <span className="mp-vinil-dica">Ouvir</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </section>

        {tickerItems.length > 0 && (
          <div className="ticker" aria-label={genres.join(", ")}>
            <div className="track">
              {[0, 1].map((half) => (
                <div className="group" key={half} aria-hidden={half === 1 || undefined}>
                  {tickerItems.map((genre, i) => (
                    <span key={i}>{genre}</span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {visible.map((section) => {
          const Section = SECTIONS[section.id]!;
          return <Section key={section.id} {...base} number={section.number} />;
        })}
      </main>

      <Footer snapshot={snapshot}>
        {snapshot.links.map((link) => (
          <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer">
            {link.label}
          </a>
        ))}
      </Footer>
      <T02Motion />
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
  links: T02Links;
  shell: Record<string, unknown>;
}) {
  const { rider, bookingContact, documents } = content;
  const whatsapp = bookingContact?.whatsapp ? digitsOnly(bookingContact.phone) : "";
  let counter = 0;
  const next = () => String(++counter).padStart(2, "0");

  return (
    <div {...shell}>
      <nav className="nav">
        <a className="logo" href={links.home}>
          <Brand snapshot={snapshot} />
        </a>
        <div className="nav-links" id="t02-menu">
          <a href={links.home}>Voltar à página</a>
          <a href="#pedido">Pedido</a>
          {rider && rider.technical.length > 0 && <a href="#rider">Rider técnico</a>}
          {rider && rider.hospitality.length > 0 && <a href="#hospitalidade">Hospitalidade</a>}
        </div>
        <div className="nav-actions">
          {whatsapp && (
            <a className="button hot" href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer">
              WhatsApp ↗
            </a>
          )}
          <T02MenuButton />
        </div>
      </nav>

      <main id="top" className="mp-pagina-interior">
        <section className="section" id="pedido">
          <div className="shell">
            <div className="head reveal">
              <div className="label">{next()} / PEDIDO</div>
              <h2>
                <Words lines={["Reservar", `${snapshot.profile.displayName}.`]} />
              </h2>
            </div>
            <div className="mp-grelha duas reveal">
              <div>
                <p className="player-note">
                  Preenche os campos e o pedido chega à equipa do artista.
                  {whatsapp ? " Se preferires, continua a conversa no WhatsApp com o pedido já escrito." : ""} Um pedido
                  não é uma reserva confirmada.
                </p>
                <T02BookingForm
                  slug={snapshot.slug}
                  artistName={snapshot.profile.displayName}
                  whatsapp={whatsapp || null}
                  enabled={snapshot.booking.enabled}
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
                          <a href={`tel:+${digitsOnly(bookingContact.phone)}`} style={{ color: "inherit", fontSize: 13, opacity: 0.75 }}>
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
                      <a className="mp-descarga" href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer">
                        <i>↗</i>
                        <div>
                          <b>WhatsApp</b>
                          <small>Resposta mais rápida</small>
                        </div>
                      </a>
                    )}
                  </div>
                )}
                {(documents.rider || documents.presskit || documents.folder) && (
                  <div className="mp-descargas">
                    {documents.rider && (
                      <a className="mp-descarga" href={documents.rider} download>
                        <i>↓</i>
                        <div>
                          <b>Rider em PDF</b>
                          <small>Técnico e hospitalidade</small>
                        </div>
                      </a>
                    )}
                    {documents.presskit && (
                      <a className="mp-descarga" href={documents.presskit} download>
                        <i>↓</i>
                        <div>
                          <b>Press kit em PDF</b>
                          <small>Biografia, música, palmarés e rider</small>
                        </div>
                      </a>
                    )}
                    {documents.folder && (
                      <a className="mp-descarga" href={documents.folder} {...external(documents.folder)}>
                        <i>↗</i>
                        <div>
                          <b>Pasta completa</b>
                          <small>Fotografias, logótipos e vídeos</small>
                        </div>
                      </a>
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
              <Head number={next()} label="RIDER TÉCNICO" lines={["O que tem", "de estar em cabine."]} />
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
                      data-mp-lightbox-legenda={rider.diagramCaption ?? "Esquema de ligações"}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={rider.diagram.url} alt="Esquema de ligações" />
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
              <Head number={next()} label="HOSPITALIDADE" lines={["Camarim", "e convidados."]} />
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
      <T02Motion />
    </div>
  );
}
