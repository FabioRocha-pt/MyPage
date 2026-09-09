import type { PageSnapshot, SectionId } from "@/lib/page-model";
import { pressCategoryLabel } from "@/lib/press";
import { Embed } from "./Embed";
import { BookingForm } from "./BookingForm";
import { DonateBlock } from "./DonateBlock";
import { StoreBlock } from "./StoreBlock";

/**
 * The common section renderer.
 *
 * Doc 03: "Os cinco templates usam um renderer de secções comum com
 * apresentações distintas."
 *
 * Every template renders these exact components; the visual difference lives
 * entirely in CSS scoped by the `tpl-<id>` class on the shell. That is what
 * makes doc 04's criterion achievable — "cinco templates exibem conteúdo
 * equivalente e respeitam cores, ordem e seleção" — because there is no second
 * implementation that could show different content.
 */

function formatDate(iso: string, timezone: string) {
  try {
    return new Intl.DateTimeFormat("pt-PT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: timezone,
    }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleString("pt-PT");
  }
}

function splitDate(iso: string, timezone: string) {
  try {
    const date = new Date(iso);
    const day = new Intl.DateTimeFormat("pt-PT", { day: "2-digit", timeZone: timezone }).format(date);
    const month = new Intl.DateTimeFormat("pt-PT", { month: "short", timeZone: timezone })
      .format(date)
      .replace(".", "")
      .toUpperCase();
    return { day, month };
  } catch {
    return { day: "--", month: "---" };
  }
}

export function SectionBiography({ snapshot }: { snapshot: PageSnapshot }) {
  const { profile, images } = snapshot;
  if (!profile.bio && !images.portrait) return null;

  return (
    <section className="tpl-section tpl-biography" id="about" aria-labelledby="about-title">
      <div className="tpl-inner tpl-biography-grid">
        {images.portrait && (
          <div className="tpl-portrait">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images.portrait.url}
              alt={images.portrait.alt}
              width={images.portrait.width ?? undefined}
              height={images.portrait.height ?? undefined}
              loading="lazy"
            />
          </div>
        )}
        <div className="tpl-biography-copy">
          <span className="tpl-eyebrow">Sobre</span>
          <h2 id="about-title">{profile.displayName}</h2>
          {profile.tagline && <blockquote>{profile.tagline}</blockquote>}
          {profile.bio?.split(/\n{2,}/).map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
          {(profile.city || profile.genres.length > 0) && (
            <ul className="tpl-facts">
              {profile.city && (
                <li>
                  <span>Base</span>
                  <strong>
                    {profile.city}
                    {profile.country ? `, ${profile.country}` : ""}
                  </strong>
                </li>
              )}
              {profile.genres.length > 0 && (
                <li>
                  <span>Géneros</span>
                  <strong>{profile.genres.join(" · ")}</strong>
                </li>
              )}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

export function SectionMusic({ snapshot }: { snapshot: PageSnapshot }) {
  const tracks = snapshot.tracks.filter((track) => track.placement !== "hero");
  if (tracks.length === 0) return null;

  return (
    <section className="tpl-section tpl-music" id="music" aria-labelledby="music-title">
      <div className="tpl-inner">
        <header className="tpl-section-head">
          <span className="tpl-eyebrow">Ouvir</span>
          <h2 id="music-title">Músicas e sets</h2>
        </header>
        <div className="tpl-track-list">
          {tracks.map((track) => (
            <article key={track.id} className="tpl-track">
              <div className="tpl-track-head">
                {track.mark && <span className="tpl-mark">{track.mark}</span>}
                <div>
                  <h3>{track.title}</h3>
                  {track.platformLabel && <span>{track.platformLabel}</span>}
                </div>
              </div>

              {track.embed ? (
                <Embed
                  src={track.embed.src}
                  title={track.title}
                  ratio={track.embed.ratio}
                  height={track.embed.height}
                />
              ) : track.fileUrl ? (
                <audio controls preload="none" src={track.fileUrl}>
                  O teu navegador não suporta áudio incorporado.
                </audio>
              ) : track.url ? (
                <a className="tpl-link" href={track.url} target="_blank" rel="noopener noreferrer">
                  Abrir em {track.platformLabel ?? "plataforma"} ↗
                </a>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function SectionVideo({ snapshot }: { snapshot: PageSnapshot }) {
  if (snapshot.videos.length === 0) return null;

  return (
    <section className="tpl-section tpl-video" id="video" aria-labelledby="video-title">
      <div className="tpl-inner">
        <header className="tpl-section-head">
          <span className="tpl-eyebrow">Ver</span>
          <h2 id="video-title">Vídeos</h2>
        </header>
        <div className="tpl-video-grid">
          {snapshot.videos.map((video) => (
            <article key={video.id} className="tpl-video-item">
              {video.embed ? (
                <Embed
                  src={video.embed.src}
                  title={video.title}
                  ratio={video.embed.ratio}
                  height={video.embed.height}
                />
              ) : video.fileUrl ? (
                <video controls preload="metadata" poster={video.poster ?? undefined} src={video.fileUrl} />
              ) : video.url ? (
                <a className="tpl-link" href={video.url} target="_blank" rel="noopener noreferrer">
                  Abrir vídeo ↗
                </a>
              ) : null}
              <h3>{video.title}</h3>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function SectionEvents({ snapshot }: { snapshot: PageSnapshot }) {
  const upcoming = snapshot.events.filter((event) => new Date(event.startsAt) >= new Date(Date.now() - 86400000));
  const events = upcoming.length > 0 ? upcoming : snapshot.events;
  if (events.length === 0) return null;

  return (
    <section className="tpl-section tpl-events" id="events" aria-labelledby="events-title">
      <div className="tpl-inner">
        <header className="tpl-section-head">
          <span className="tpl-eyebrow">Agenda</span>
          <h2 id="events-title">Próximas datas</h2>
        </header>
        <ul className="tpl-event-list">
          {events.map((event) => {
            const { day, month } = splitDate(event.startsAt, event.timezone);
            return (
              <li key={event.id} className="tpl-event">
                {event.poster && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="tpl-event-poster" src={event.poster} alt="" loading="lazy" />
                )}
                <time className="tpl-event-date" dateTime={event.startsAt}>
                  <strong>{day}</strong>
                  <small>{month}</small>
                </time>
                <div className="tpl-event-body">
                  <h3>{event.title}</h3>
                  <span className="tpl-event-venue">
                    {[event.venue, event.city, event.country].filter(Boolean).join(" · ")}
                  </span>
                  {event.description && <p>{event.description}</p>}
                  <span className="tpl-event-time">{formatDate(event.startsAt, event.timezone)}</span>
                </div>
                {event.ticketsUrl && (
                  <a
                    className="tpl-cta tpl-event-cta"
                    href={event.ticketsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Bilhetes ↗
                  </a>
                )}
              </li>
            );
          })}
        </ul>
        <p className="tpl-fineprint">
          A compra de bilhetes é feita fora desta página, no vendedor indicado em cada evento.
        </p>
      </div>
    </section>
  );
}

export function SectionPress({ snapshot }: { snapshot: PageSnapshot }) {
  const { albums, links } = snapshot.press;
  if (albums.length === 0 && links.length === 0) return null;

  return (
    <section className="tpl-section tpl-press" id="press" aria-labelledby="press-title">
      <div className="tpl-inner">
        <header className="tpl-section-head">
          <span className="tpl-eyebrow">Profissionais</span>
          <h2 id="press-title">Press kit</h2>
        </header>

        {links.length > 0 && (
          <ul className="tpl-press-links">
            {links.map((link) => (
              <li key={link.category}>
                <a href={link.url} target="_blank" rel="noopener noreferrer">
                  <span>{pressCategoryLabel(link.category)}</span>
                  <em>Abrir pasta ↗</em>
                </a>
              </li>
            ))}
          </ul>
        )}

        {albums.map((album) => (
          <div key={album.id} className="tpl-album">
            <h3>{album.name}</h3>
            <div className="tpl-album-grid">
              {album.items.map((item) => (
                <figure key={item.id} className="tpl-album-item">
                  {item.kind === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.url} alt={item.title} loading="lazy" />
                  ) : (
                    <div className="tpl-album-doc" aria-hidden="true">
                      {item.kind === "document" ? "PDF" : item.kind.toUpperCase()}
                    </div>
                  )}
                  <figcaption>
                    <span>{item.title}</span>
                    {item.downloadUrl && (
                      <a href={item.downloadUrl} download>
                        Descarregar original
                      </a>
                    )}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function SectionBooking({ snapshot }: { snapshot: PageSnapshot }) {
  if (!snapshot.booking.enabled) return null;

  return (
    <section className="tpl-section tpl-booking" id="booking" aria-labelledby="booking-title">
      <div className="tpl-inner">
        <header className="tpl-section-head">
          <span className="tpl-eyebrow">Booking</span>
          <h2 id="booking-title">Traz esta energia ao teu evento</h2>
        </header>
        <BookingForm slug={snapshot.slug} availability={snapshot.booking.availability} />
      </div>
    </section>
  );
}

export function SectionDonations({ snapshot }: { snapshot: PageSnapshot }) {
  if (!snapshot.campaign) return null;

  return (
    <section className="tpl-section tpl-donations" id="donations" aria-labelledby="donations-title">
      <div className="tpl-inner">
        <header className="tpl-section-head">
          <span className="tpl-eyebrow">Apoiar</span>
          <h2 id="donations-title">Donativos</h2>
        </header>
        <DonateBlock campaign={snapshot.campaign} />
      </div>
    </section>
  );
}

export function SectionStore({ snapshot }: { snapshot: PageSnapshot }) {
  if (snapshot.products.length === 0) return null;

  return (
    <section className="tpl-section tpl-store-section" id="store" aria-labelledby="store-title">
      <div className="tpl-inner">
        <header className="tpl-section-head">
          <span className="tpl-eyebrow">Loja</span>
          <h2 id="store-title">Merchandising</h2>
        </header>
        <StoreBlock products={snapshot.products} slug={snapshot.slug} />
      </div>
    </section>
  );
}

export const SECTION_COMPONENTS: Partial<
  Record<SectionId, (props: { snapshot: PageSnapshot }) => React.ReactElement | null>
> = {
  biography: SectionBiography,
  music: SectionMusic,
  video: SectionVideo,
  events: SectionEvents,
  press: SectionPress,
  booking: SectionBooking,
  donations: SectionDonations,
  store: SectionStore,
};

/** Renders enabled sections in the artist's chosen order, hero excluded. */
export function SectionStack({ snapshot }: { snapshot: PageSnapshot }) {
  return (
    <>
      {snapshot.sections
        .filter((section) => section.enabled && section.id !== "hero")
        .sort((a, b) => a.position - b.position)
        .map((section) => {
          const Component = SECTION_COMPONENTS[section.id];
          return Component ? <Component key={section.id} snapshot={snapshot} /> : null;
        })}
    </>
  );
}
