import { Fragment, type ReactNode } from "react";
import { snapshotContent, type PageSnapshot, type SectionId, type SnapshotContent } from "@/lib/page-model";
import { digitsOnly, youtubeId, youtubeThumbnail } from "@/lib/page-content";
import { DonateBlock } from "../shared/DonateBlock";
import { StoreBlock } from "../shared/StoreBlock";
import { ORIGIN, external, playerOf, splitDate, type HandoffLinks } from "../handoff/common";
import { T06Behaviour } from "./T06Client";
import "@/styles/template-06.css";

/**
 * Página 3 · DJs & Producers — template 06, from the Ellputo handoff
 * (Entrega-Fabio-Pagina-03-DJs-Producers-2026-10-14). Internally the handoff
 * still calls it "Template 06 · Fusion" (Editorial + Ember); the id follows
 * that name so the old Raw template (03) is not overwritten.
 *
 * The markup is the handoff's `site/index.html`, filled on the server from the
 * published snapshot; the styles are its four layers, scoped under `.t06` by
 * scripts/scope-template-css.py; the behaviour (menu, motion pause, parallax,
 * portrait carousel, video and photo dialogs) is `T06Client`.
 *
 * Rules from IMPLEMENTACAO.md kept here:
 *   - nothing about Ellputo is fixed in the component: copy that names the
 *     artist comes from the snapshot, the rest is the template's own;
 *   - a section without data is left out, with its link and its shortcut;
 *   - booking leads to the contacts — no form, no confirmation;
 *   - one photo in About is static (no counter or controls), none hides it;
 *   - YouTube is embedded only after a click, from youtube-nocookie.com.
 */

interface Props {
  snapshot: PageSnapshot;
  links: HandoffLinks;
}

type Ctx = { snapshot: PageSnapshot; content: SnapshotContent; label: (text: string) => string };

const FONTS =
  "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap";

/**
 * "↗" with the text-presentation selector, so iOS never draws the emoji. The
 * handoff wraps it in a <span> in some places (styled) and not in others; the
 * markup follows it, so `Arrow` is the span and `ARROW` the bare glyph.
 */
const ARROW = "↗\uFE0E";

function Arrow() {
  return <span aria-hidden="true">{ARROW}</span>;
}

/** Vertical label right before the title, as in every section of the handoff. */
function Lockup({ label, main, em, as: Tag = "h2", id }: { label: string; main: ReactNode; em?: ReactNode; as?: "h2" | "h3"; id?: string }) {
  return (
    <div className="heading-lockup">
      <p className="eyebrow vertical-label">{label}</p>
      <Tag id={id}>
        {main}
        {em && (
          <>
            <br />
            <em>{em}</em>
          </>
        )}
      </Tag>
    </div>
  );
}

/** "Feel it.\nDon't explain it." — the second line is the highlighted one. */
function splitStatement(value: string | null | undefined): [string, string | null] {
  const [first, ...rest] = String(value ?? "").split(/\n+/);
  return [first.trim(), rest.join(" ").trim() || null];
}

const upper = (value: string) => value.toLocaleUpperCase("en");

// --- Sections ----------------------------------------------------------------------

function About({ snapshot, content, label }: Ctx) {
  const photos = content.bioPhotos.length ? content.bioPhotos : snapshot.images.portrait ? [snapshot.images.portrait] : [];
  const paragraphs = (snapshot.profile.bio ?? "")
    .split(/\n{2,}/)
    .map((text) => text.trim())
    .filter(Boolean);
  const [lead, ...rest] = paragraphs;
  const facts = content.facts ?? [];
  const presskit = snapshot.sections.some((s) => s.id === "press" && s.enabled) ? content.documents.presskit : null;
  const many = photos.length > 1;

  return (
    <section className={`section about${photos.length ? "" : " about-solo"}`} id="about">
      {photos.length > 0 && (
        <div
          className={`photo-wrap reveal${many ? " portrait-carousel" : " portrait-single"}`}
          {...(many
            ? { role: "region", "aria-roledescription": "carousel", "aria-label": `${snapshot.profile.displayName} portraits` }
            : {})}
        >
          <div className="portrait-slides">
            {photos.map((photo, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={photo.mediaId + i}
                className={`portrait-slide${i === 0 ? " active" : ""}`}
                src={photo.url}
                alt={many ? `${photo.alt}, photograph ${i + 1} of ${photos.length}` : photo.alt}
                width={photo.width ?? undefined}
                height={photo.height ?? undefined}
                loading="lazy"
                {...(i > 0 ? { "aria-hidden": true } : {})}
              />
            ))}
          </div>
          {many && (
            <div className="portrait-controls">
              <span className="portrait-index" aria-live="off">
                01 / {String(photos.length).padStart(2, "0")}
              </span>
              <div>
                <button type="button" data-slide="-1" aria-label="Previous photograph">
                  ←
                </button>
                <button type="button" className="slide-pause" aria-pressed="false">
                  Pause
                </button>
                <button type="button" data-slide="1" aria-label="Next photograph">
                  →
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      <div className="about-copy reveal">
        <Lockup
          label={label("THE ARTIST")}
          main={snapshot.profile.country ? `Rooted in ${snapshot.profile.country}.` : "Rooted in the music."}
          em="Made to resonate."
        />
        {lead && <p className="lead">{lead}</p>}
        {rest.map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
        {presskit && (
          <a className="text-link" href={presskit} download>
            Download artist profile <span>↓</span>
          </a>
        )}
        {facts.length > 0 && (
          <div className="facts">
            {facts.map((fact, i) => (
              <div key={i}>
                <strong>{fact.value}</strong>
                <span>{fact.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function Journey({ content, label }: Ctx) {
  return (
    <section className="section journey">
      <div className="section-heading reveal">
        <Lockup label={label("THE JOURNEY")} main="A sound." em="A movement." />
      </div>
      <div className="timeline reveal">
        {(content.timeline ?? []).map((item, i) => (
          <article key={i}>
            <span>{item.period}</span>
            <h3>{item.title}</h3>
            {item.text && <p>{item.text}</p>}
          </article>
        ))}
      </div>
    </section>
  );
}

function Music({ snapshot, content, label, videos }: Ctx & { videos: boolean }) {
  const player = playerOf(snapshot);
  const name = snapshot.profile.displayName;
  const others = snapshot.tracks.filter((track) => track !== player && track.url);
  const photo = content.musicPhoto ?? null;

  return (
    <section className="section music" id="music">
      <div className="section-heading reveal">
        <div>
          <Lockup label={label("SELECTED PROJECTS")} main="Always creating." em="Always moving." />
        </div>
        {videos && (
          <a className="text-link" href="#videos">
            Watch the videos {ARROW}
          </a>
        )}
      </div>
      {player?.embed && (
        <div className="listen-panel" id="listen">
          <div>
            <Lockup
              as="h3"
              label={upper(`${name} on ${player.platformLabel ?? "the player"}`)}
              main={
                <>
                  Press play.
                  <br />
                  Stay for the feeling.
                </>
              }
            />
            <p>Listen directly here or open your favourite platform.</p>
            {player.url && (
              <a className="button primary" href={player.url} {...external(player.url)}>
                OPEN {upper(player.platformLabel ?? "player")} {ARROW}
              </a>
            )}
          </div>
          <div className="spotify-frame">
            <iframe
              title={`${name} on ${player.platformLabel ?? "the player"}`}
              src={player.embed.src}
              width="100%"
              height={player.embed.height ?? 352}
              loading="lazy"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              allowFullScreen
            />
            {player.url && (
              <p>
                Player unavailable?{" "}
                <a href={player.url} {...external(player.url)}>
                  Listen on {player.platformLabel ?? "the platform"} {ARROW}
                </a>
              </p>
            )}
          </div>
        </div>
      )}
      {others.length > 0 && (
        <div className="listening-links">
          {others.map((track) => (
            <a key={track.id} href={track.url!} {...external(track.url)}>
              {upper(track.title)} {ARROW}
            </a>
          ))}
        </div>
      )}
      {(content.discography.length > 0 || photo) && (
        <div className={`music-grid${photo ? "" : " music-grid-solo"}`}>
          {photo && (
            <div className="music-photo reveal">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt={photo.alt} width={photo.width ?? undefined} height={photo.height ?? undefined} loading="lazy" />
              <span>{upper(`The ${name} sound`)}</span>
            </div>
          )}
          {content.discography.length > 0 && (
            <div className="tracks reveal">
              {content.discography.map((item, i) => {
                const body = (
                  <>
                    <span>{String(i + 1).padStart(2, "0")}</span>
                    <div>
                      <h3>{item.title}</h3>
                      {(item.with || item.year) && <p>{[item.with, item.year].filter(Boolean).join(" · ")}</p>}
                    </div>
                    {item.type && <small>{upper(item.type)}</small>}
                  </>
                );
                const video = youtubeId(item.url);
                return item.url ? (
                  <article key={i}>
                    <a
                      className="track-link"
                      href={item.url}
                      {...(video ? { "data-video": video, "data-title": item.title } : external(item.url))}
                    >
                      {body}
                    </a>
                  </article>
                ) : (
                  <article key={i}>{body}</article>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function Collaborations({ content, label }: Ctx) {
  return (
    <section className="section collaborations">
      <p className="eyebrow reveal">{label("PRODUCTIONS & COLLABORATIONS")}</p>
      <h2 className="reveal">
        Different voices.
        <br />
        <em>Shared energy.</em>
      </h2>
      <div className="collab-grid reveal">
        {(content.collaborations ?? []).map((group, i) => (
          <div key={i}>
            {group.label && <span className="label">{upper(group.label)}</span>}
            <p>{group.names}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

const SHOWN_AWARDS = 4;

function Awards({ content, label }: Ctx) {
  const photo = content.highlightsPhoto ?? null;
  const shown = content.highlights.slice(0, SHOWN_AWARDS);
  const more = content.highlights.slice(SHOWN_AWARDS);
  return (
    <section className="section awards" id="awards">
      <div className="awards-intro reveal">
        <Lockup label={label("RECOGNITION")} main="Work that" em="speaks." />
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo.url} alt={photo.alt} width={photo.width ?? undefined} height={photo.height ?? undefined} loading="lazy" />
        )}
      </div>
      <div className="award-list reveal">
        {shown.map((item, i) => (
          <article key={i}>
            {item.year && <span>{item.year}</span>}
            <h3>{item.title}</h3>
            {(item.detail || item.type) && <p>{[item.type, item.detail].filter(Boolean).join(" · ")}</p>}
          </article>
        ))}
        {more.length > 0 && (
          <details>
            <summary>
              More recognition <span>＋</span>
            </summary>
            <p>
              {more.map((item, i) => (
                <span key={i}>
                  {i > 0 && <br />}
                  {[item.year, [item.title, item.type, item.detail].filter(Boolean).join(", ")].filter(Boolean).join(" · ")}
                </span>
              ))}
            </p>
          </details>
        )}
      </div>
    </section>
  );
}

function Stories({ content, label }: Ctx) {
  const stories = content.stories!;
  const [line1, line2] = splitStatement(stories.statement);
  return (
    <section className="section campaigns" id="stories">
      <div className="section-heading reveal">
        <div>
          <Lockup label={label("MUSIC MEETS BRANDS")} main="Stories you" em="can feel." />
        </div>
        {stories.intro && <p>{stories.intro}</p>}
      </div>
      {(stories.reel || stories.photo) && (
        <div className={`story-stage${stories.reel ? "" : " story-stage-photo"}`}>
          {stories.reel && (
            <figure className="story-film">
              <video controls playsInline preload="none" poster={stories.reel.poster ?? undefined} aria-label={stories.reel.title}>
                <source src={stories.reel.src} type="video/mp4" />
                <a href={stories.reel.src}>Open {stories.reel.title}</a>
              </video>
              <figcaption>
                <span>01 / {upper(stories.reel.title)}</span>
                <a href={stories.reel.src} target="_blank" rel="noopener">
                  Open video {ARROW}
                </a>
              </figcaption>
            </figure>
          )}
          {stories.photo && (
            <figure className="story-cutout">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={stories.photo.url}
                width={stories.photo.width ?? undefined}
                height={stories.photo.height ?? undefined}
                alt={stories.photo.alt}
                loading="lazy"
              />
              {stories.photoCaption && <figcaption>{upper(stories.photoCaption)}</figcaption>}
            </figure>
          )}
          {line1 && (
            <span className="story-type" aria-hidden="true">
              {upper(line1)}
              {line2 && (
                <>
                  <br />
                  {upper(line2)}
                </>
              )}
            </span>
          )}
        </div>
      )}
      {stories.credits.length > 0 && (
        <div className="campaign-credits">
          <p className="eyebrow">CAMPAIGN CREDITS</p>
          {stories.creditsNote && <p>{stories.creditsNote}</p>}
          <ul>
            {stories.credits.map((credit, i) => (
              <li key={i}>
                {credit.year && <span>{credit.year}</span>} {credit.title} {credit.client && <small>{credit.client}</small>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Videos({ snapshot, label }: Ctx) {
  const channel = snapshot.links.find((link) => link.platform === "youtube");
  return (
    <section className="section videos" id="videos">
      <div className="section-heading reveal">
        <div>
          <Lockup
            label={label("IN MOTION")}
            main={
              <>
                Turn it <em>up.</em>
              </>
            }
          />
        </div>
        {channel && (
          <a className="button" href={channel.url} target="_blank" rel="noopener noreferrer">
            YOUTUBE CHANNEL {ARROW}
          </a>
        )}
      </div>
      <div className="video-grid reveal">
        {snapshot.videos.map((video) => {
          const id = youtubeId(video.embed?.src ?? video.url);
          const href = video.url ?? video.fileUrl ?? "#";
          const poster = video.poster ?? (id ? youtubeThumbnail(id) : null);
          const playlist = /[?&]list=/.test(video.url ?? "");
          return (
            <a
              key={video.id}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              {...(id ? { "data-video": id, "data-title": video.title } : {})}
            >
              <div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {poster && <img src={poster} alt={video.title} loading="lazy" />}
                <span className="play">▶</span>
              </div>
              <h3>
                {video.title} <Arrow />
              </h3>
              <p>{playlist ? "Explore the playlist" : video.platform === "youtube" || id ? "Watch on YouTube" : "Watch the video"}</p>
            </a>
          );
        })}
      </div>
    </section>
  );
}

function Gallery({ content, label }: Ctx) {
  const film = content.galleryFilm ?? null;
  return (
    <section className="section photo-gallery" id="gallery">
      <div className="section-heading">
        <div>
          <Lockup label={label("PHOTO JOURNAL")} main="Different frames." em="Same energy." />
        </div>
        {content.gallery.length > 0 && (
          <p>
            A different perspective.
            <br />
            Select a photograph to explore.
          </p>
        )}
      </div>
      {content.gallery.length > 0 && (
        <div className="gallery-grid">
          {content.gallery.map((item, i) => {
            const alt = item.caption ?? item.image.alt;
            const n = String(i + 1).padStart(2, "0");
            const className = `gallery-shot shot-${(i % 10) + 1}`;
            const picture = (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.image.url}
                alt={alt}
                loading="lazy"
                width={item.image.width ?? undefined}
                height={item.image.height ?? undefined}
              />
            );
            return item.videoId ? (
              <a
                key={i}
                className={className}
                href={`https://youtu.be/${item.videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                data-video={item.videoId}
                data-title={alt}
                aria-label={`Play: ${alt}`}
              >
                {picture}
                <span>{n} / PLAY ▶</span>
              </a>
            ) : (
              <a key={i} className={className} href={item.image.url} data-gallery={i} aria-label={`Enlarge: ${alt}`}>
                {picture}
                <span>
                  {n} / VIEW {ARROW}
                </span>
              </a>
            );
          })}
        </div>
      )}
      {film && (
        <figure className="experience-film">
          <video controls playsInline preload="none" poster={film.poster ?? undefined} aria-label={film.title}>
            <source src={film.src} type="video/mp4" />
            <a href={film.src}>Open {film.title}</a>
          </video>
          <figcaption>
            {upper(film.title)}{" "}
            <a href={film.src} target="_blank" rel="noopener">
              Open video {ARROW}
            </a>
          </figcaption>
        </figure>
      )}
    </section>
  );
}

function Events({ snapshot, label }: Ctx) {
  return (
    <section className="section journey events-06" id="events">
      <div className="section-heading reveal">
        <Lockup label={label("ON STAGE")} main="Next dates." em="See you there." />
      </div>
      <div className="timeline reveal">
        {snapshot.events.map((event) => {
          const { day, month } = splitDate(event.startsAt, event.timezone);
          return (
            <article key={event.id}>
              <span>
                <time dateTime={event.startsAt}>
                  {day} {month}
                </time>
              </span>
              <h3>{event.title}</h3>
              <p>{[event.venue, event.city, event.country].filter(Boolean).join(" · ")}</p>
              {event.ticketsUrl && (
                <a className="text-link" href={event.ticketsUrl} {...external(event.ticketsUrl)}>
                  Tickets {ARROW}
                </a>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function Booking({ snapshot, content, label }: Ctx) {
  const contact = content.bookingContact;
  const regions = content.bookingRegions ?? [];
  const presskit = snapshot.sections.some((s) => s.id === "press" && s.enabled) ? content.documents.presskit : null;
  const number = digitsOnly(contact?.phone);
  return (
    <section className="section booking" id="booking">
      <div className="booking-orbit" aria-hidden="true" />
      <Lockup label={label("BOOKINGS & COLLABORATIONS")} main="Let's make" em="some noise." />
      <div className="booking-grid">
        {regions.map((region) => (
          <a key={region.email + region.label} href={`mailto:${region.email}`}>
            <span>{upper(region.label || "Bookings")}</span>
            <strong>{region.email}</strong>
            <b aria-hidden="true">{ARROW}</b>
          </a>
        ))}
        {contact?.email && !regions.some((region) => region.email === contact.email) && (
          <a href={`mailto:${contact.email}`}>
            <span>{upper([contact.name, contact.role].filter(Boolean).join(" · ") || "Bookings")}</span>
            <strong>{contact.email}</strong>
            <b aria-hidden="true">{ARROW}</b>
          </a>
        )}
      </div>
      {(contact?.phone || presskit) && (
        <div className="booking-bottom">
          {contact?.phone && <a href={`tel:+${number}`}>{contact.phone}</a>}
          {contact?.whatsapp && number && (
            <a href={`https://wa.me/${number}`} target="_blank" rel="noopener noreferrer">
              WhatsApp {ARROW}
            </a>
          )}
          {presskit && (
            <a className="button" href={presskit} download>
              Download press kit ↓
            </a>
          )}
        </div>
      )}
    </section>
  );
}

function Shared({ id, label, title, children }: { id: string; label: string; title: string; children: ReactNode }) {
  return (
    <section className="section shared-06" id={id}>
      <div className="section-heading reveal">
        <Lockup label={label} main={title} />
      </div>
      {children}
    </section>
  );
}

// --- Page ----------------------------------------------------------------------------

/** Whether a section has something to show on this template. */
function present(id: SectionId, snapshot: PageSnapshot, content: SnapshotContent): boolean {
  switch (id) {
    case "biography":
      return Boolean(snapshot.profile.bio?.trim());
    case "music":
      return snapshot.tracks.length > 0 || content.discography.length > 0 || (content.collaborations ?? []).length > 0;
    case "highlights":
      return content.highlights.length > 0;
    case "video":
      return snapshot.videos.length > 0 || Boolean(content.stories);
    case "gallery":
      return content.gallery.length > 0 || Boolean(content.galleryFilm);
    case "events":
      return snapshot.events.length > 0;
    case "booking":
      return Boolean(content.bookingContact) || (content.bookingRegions ?? []).length > 0;
    case "donations":
      return Boolean(snapshot.campaign);
    case "store":
      return snapshot.products.length > 0;
    default:
      return false;
  }
}

export function Template06({ snapshot }: Props) {
  const content = snapshotContent(snapshot);
  const { profile } = snapshot;
  const name = profile.displayName;

  const visible = snapshot.sections
    .filter((section) => section.enabled && section.id !== "hero")
    .sort((a, b) => a.position - b.position)
    .map((section) => section.id)
    .filter((id) => present(id, snapshot, content));
  const has = (id: SectionId) => visible.includes(id);

  // Every titled block is numbered in reading order ("01 / THE ARTIST"); the
  // number is fixed here, when the block is placed, not when React renders it.
  let count = 0;
  const numbered = () => {
    const n = String(++count).padStart(2, "0");
    return (text: string) => `${n} / ${text}`;
  };
  const at = (): Ctx => ({ snapshot, content, label: numbered() });

  const blocks: ReactNode[] = [];
  for (const id of visible) {
    if (id === "biography") {
      blocks.push(<About key="about" {...at()} />);
      if ((content.timeline ?? []).length) blocks.push(<Journey key="journey" {...at()} />);
    } else if (id === "music") {
      if (snapshot.tracks.length || content.discography.length) {
        blocks.push(<Music key="music" {...at()} videos={has("video") && snapshot.videos.length > 0} />);
      }
      if ((content.collaborations ?? []).length) blocks.push(<Collaborations key="collab" {...at()} />);
    } else if (id === "highlights") {
      blocks.push(<Awards key="awards" {...at()} />);
    } else if (id === "video") {
      if (content.stories) blocks.push(<Stories key="stories" {...at()} />);
      if (snapshot.videos.length) blocks.push(<Videos key="videos" {...at()} />);
    } else if (id === "gallery") {
      blocks.push(<Gallery key="gallery" {...at()} />);
    } else if (id === "events") {
      blocks.push(<Events key="events" {...at()} />);
    } else if (id === "booking") {
      blocks.push(<Booking key="booking" {...at()} />);
    } else if (id === "donations") {
      blocks.push(
        <Shared key="donations" id="support" label={numbered()("SUPPORT")} title="Be part of it.">
          <DonateBlock campaign={snapshot.campaign!} />
        </Shared>,
      );
    } else if (id === "store") {
      blocks.push(
        <Shared key="store" id="store" label={numbered()("STORE")} title="Take it with you.">
          <StoreBlock products={snapshot.products} slug={snapshot.slug} />
        </Shared>,
      );
    }
  }

  const musicAnchor = has("music") && (snapshot.tracks.length || content.discography.length) ? "#music" : null;
  const listenAnchor = playerOf(snapshot)?.embed ? "#listen" : musicAnchor;
  const videosAnchor = has("video") ? (snapshot.videos.length ? "#videos" : "#stories") : null;
  const bookable = has("booking");
  const presskit = snapshot.sections.some((s) => s.id === "press" && s.enabled) ? content.documents.presskit : null;

  const nav = [
    has("biography") && { href: "#about", label: "The artist" },
    musicAnchor && { href: musicAnchor, label: "Music" },
    videosAnchor && { href: videosAnchor, label: "Videos" },
    has("gallery") && { href: "#gallery", label: "Photos" },
    has("events") && { href: "#events", label: "Dates" },
  ].filter((link): link is { href: string; label: string } => Boolean(link));

  const world = [
    musicAnchor && { href: musicAnchor, title: ["Music", "& projects ↗"], text: "Selected productions and collaborations." },
    videosAnchor && { href: videosAnchor, title: ["Watch", "the sound ↗"], text: `Music videos and the ${name} experience.` },
    presskit && { href: presskit, title: ["The", "press kit ↓"], text: "The artist profile. Ready to download.", download: true },
    has("biography") && {
      href: "#about",
      title: ["Behind", "the music ↗"],
      text: profile.country ? `From ${profile.country} to the world.` : "The story behind the sound.",
    },
    bookable && { href: "#booking", title: ["Let's", "connect ↗"], text: "Bookings and creative collaborations." },
  ].filter((card): card is { href: string; title: string[]; text: string; download?: boolean } => Boolean(card));

  // Hero: the logo file, not the name in a font. Cut-outs back to front, the last one in front.
  const heroLogo = content.logoHero ?? snapshot.images.logo;
  const cutouts = content.heroPhotos ?? [];
  const person = cutouts.length ? cutouts[cutouts.length - 1] : (snapshot.images.portrait ?? snapshot.images.hero);
  const echoes = cutouts.slice(0, -1).slice(-2);
  const [statement, statementEm] = splitStatement(content.heroStatement);
  const eyebrow = content.roleLine ?? [profile.city, profile.country].filter(Boolean).join(" / ");
  const ticker = (content.ticker ?? []).length ? content.ticker! : profile.genres;
  const audience = content.stats.length > 0;
  const allLinks = [
    ...snapshot.tracks.filter((track) => track.url).map((track) => ({ url: track.url!, label: track.title })),
    ...snapshot.links.map((link) => ({ url: link.url, label: link.label })),
  ].filter((link, i, list) => list.findIndex((other) => other.url === link.url) === i);
  const brandLogo = snapshot.images.logo;

  return (
    <div
      className="t06 template-06 motion-edition"
      data-template="06"
      data-artist={name}
      data-slug={snapshot.slug}
    >
      <link rel="stylesheet" href={FONTS} precedence="default" />
      <a className="skip" href={has("biography") ? "#about" : "#main-06"}>
        Skip to content
      </a>
      <header>
        <a className="brand" href="#home" aria-label={`${name} home`}>
          {brandLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={brandLogo.url} alt={name} width={brandLogo.width ?? undefined} height={brandLogo.height ?? undefined} />
          ) : (
            <span className="brand-name">{name}</span>
          )}
        </a>
        <button className="menu" type="button" aria-expanded="false" aria-controls="navigation">
          Menu <span>＋</span>
        </button>
        <nav id="navigation" aria-label="Main navigation">
          {nav.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
          {bookable && (
            <a href="#booking" className="nav-book">
              Let&apos;s connect <Arrow />
            </a>
          )}
        </nav>
      </header>

      <main id="main-06">
        <section className="hero" id="home">
          <div className="hero-slab" aria-hidden="true" />
          <div className="hero-copy">
            <div className="hero-heading-lockup">
              {eyebrow && (
                <p className="eyebrow vertical-label">
                  <span className="dot" /> {upper(eyebrow)}
                </p>
              )}
              <h1>
                {heroLogo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    className="hero-artist-logo"
                    src={heroLogo.url}
                    alt={name}
                    width={heroLogo.width ?? undefined}
                    height={heroLogo.height ?? undefined}
                    fetchPriority="high"
                  />
                ) : (
                  <span className="hero-artist-name">{name}</span>
                )}
                {statement && (
                  <span className="hero-statement">
                    {upper(statement)}
                    {statementEm && (
                      <>
                        <br />
                        <em>{upper(statementEm)}</em>
                      </>
                    )}
                  </span>
                )}
              </h1>
            </div>
            {profile.tagline && <p className="intro">{profile.tagline}</p>}
            {(listenAnchor || bookable) && (
              <div className="actions">
                {listenAnchor && (
                  <a className="button primary" href={listenAnchor}>
                    PLAY THE SOUND <Arrow />
                  </a>
                )}
                {bookable && (
                  <a className="button hero-book" href="#booking">
                    {upper(`Book ${name}`)} {ARROW}
                  </a>
                )}
              </div>
            )}
          </div>
          {person && (
            <div className="hero-collage" data-parallax="0.12">
              {echoes.map((echo, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={echo.mediaId + i}
                  className={`echo ${i === 0 ? "echo-one" : "echo-two"}`}
                  src={echo.url}
                  alt=""
                  width={echo.width ?? undefined}
                  height={echo.height ?? undefined}
                />
              ))}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className={`hero-person${cutouts.length ? "" : " hero-person-photo"}`}
                src={person.url}
                alt={person.alt}
                width={person.width ?? undefined}
                height={person.height ?? undefined}
                fetchPriority="high"
              />
            </div>
          )}
          <div className="hero-foot">
            <span>THE SOUND. THE ENERGY. THE ARTIST.</span>
            <a href={audience || allLinks.length ? "#audience" : "#main-06"}>SCROLL TO EXPLORE ↓</a>
            <button type="button" className="motion-toggle" aria-pressed="false">
              Pause motion
            </button>
          </div>
        </section>

        {ticker.length > 0 && (
          <div className="ticker" aria-label={ticker.join(", ")}>
            <div aria-hidden="true">
              {/* Two rounds: the band slides by half its width and loops. */}
              {[0, 1].map((round) =>
                ticker.map((word, i) => (
                  <Fragment key={`${round}-${i}`}>
                    {upper(word)} <span>✳</span>{" "}
                  </Fragment>
                )),
              )}
            </div>
          </div>
        )}

        {(audience || allLinks.length > 0) && (
          <section className="section audience" id="audience">
            <div className="audience-head">
              <p className="eyebrow">A SOUND THAT CONNECTS</p>
              {audience && content.statsNote && <p className="source-note">{content.statsNote}</p>}
            </div>
            {audience && (
              <div className="audience-grid">
                {content.stats.map((stat, i) =>
                  stat.url ? (
                    <a key={i} href={stat.url} target="_blank" rel="noopener noreferrer">
                      <strong>{stat.value}</strong>
                      <span>
                        {upper(stat.label)} {ARROW}
                      </span>
                    </a>
                  ) : (
                    <a key={i} role="presentation">
                      <strong>{stat.value}</strong>
                      <span>{upper(stat.label)}</span>
                    </a>
                  ),
                )}
              </div>
            )}
            {allLinks.length > 0 && (
              <nav className="social-links" aria-label={`${name} music and social profiles`}>
                {allLinks.map((link) => (
                  <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer">
                    {link.label} <Arrow />
                  </a>
                ))}
              </nav>
            )}
          </section>
        )}

        {world.length > 0 && (
          <section className="section artist-world" aria-labelledby="world-title">
            <div className="world-heading">
              <Lockup label={upper(`Explore ${name}`)} main="One artist." em="A whole world." id="world-title" />
            </div>
            <div className="world-grid">
              {world.map((card) => (
                <a key={card.href} className="world-card" href={card.href} {...(card.download ? { download: true } : {})}>
                  <strong>
                    {card.title[0]}
                    <br />
                    {card.title[1]}
                  </strong>
                  <span>{card.text}</span>
                </a>
              ))}
              <p className="world-note">
                Different stages.
                <br />
                The same energy.
              </p>
            </div>
          </section>
        )}

        {blocks}
      </main>

      <footer>
        <a className="brand" href="#home">
          {brandLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={brandLogo.url} alt={name} width={brandLogo.width ?? undefined} height={brandLogo.height ?? undefined} />
          ) : (
            <span className="brand-name">{name}</span>
          )}
        </a>
        <span>{content.roleLine ?? [profile.city, profile.country].filter(Boolean).join(", ")}</span>
        <a href="#home">Back to top ↑</a>
        {snapshot.branding.showMyPageBadge && (
          <small>
            <a href={ORIGIN} target="_blank" rel="noopener">
              My Page · Powered by Muska
            </a>
          </small>
        )}
      </footer>

      <dialog className="video-dialog" aria-labelledby="video-title-06">
        <div className="video-dialog-head">
          <h2 id="video-title-06">{name} · Music video</h2>
          <button type="button" className="video-close" aria-label="Close video">
            ×
          </button>
        </div>
        <div className="video-player" />
        <a className="video-fallback" target="_blank" rel="noopener noreferrer">
          Watch on YouTube {ARROW}
        </a>
      </dialog>
      <dialog className="gallery-dialog" aria-label={`${name} photo gallery`}>
        <button className="gallery-close" type="button" aria-label="Close photograph">
          ×
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="gallery-full" alt="" />
        <div className="gallery-bar">
          <button type="button" data-gallery-step="-1" aria-label="Previous photograph">
            ←
          </button>
          <span className="gallery-caption" aria-live="polite" />
          <button type="button" data-gallery-step="1" aria-label="Next photograph">
            →
          </button>
        </div>
      </dialog>

      <aside className="floating-actions" aria-label="Quick navigation">
        {bookable && (
          <a className="floating-booking" href="#booking">
            BOOKING{" "}
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 19 19 5M5 5h14v14" />
            </svg>
          </a>
        )}
        <a className="floating-top" href="#home" aria-label="Back to top" title="Back to top">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 20V5m-7 7 7-7 7 7M5 3h14" />
          </svg>
        </a>
      </aside>
      <T06Behaviour />
    </div>
  );
}
