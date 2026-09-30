import type { PageSnapshot, SectionId, SnapshotContent } from "@/lib/page-model";

/**
 * Pieces shared by the renderers built from the My Page handoffs: Template 02
 * · versão 1 (Deekay) and Template 01 · versão 1 (Kevy). The two pages run on
 * the same engine and data contract, so whether a section has content, how the
 * biography splits into chapters and which track is the player are decided
 * once, here.
 */

export interface HandoffLinks {
  home: string;
  /** The booking page. Null where it does not exist (the catalogue demo). */
  booking: string | null;
}

export const ORIGIN = process.env.NEXT_PUBLIC_SITE_URL || "/";

export function external(url: string | null | undefined) {
  return url && /^https?:/i.test(url) ? { target: "_blank", rel: "noopener noreferrer" } : {};
}

/** Title split word by word on the server, as `partirPalavras` did in the browser. */
export function Words({ lines }: { lines: string[] }) {
  let n = 0;
  return (
    <>
      {lines.map((line, i) => (
        <span key={i}>
          {i > 0 && <br />}
          {line
            .split(/(\s+)/)
            .filter(Boolean)
            .map((word, j) =>
              /^\s+$/.test(word) ? (
                word
              ) : (
                <span className="mp-palavra" key={j}>
                  <span style={{ transitionDelay: `${n++ * 70}ms` }}>{word}</span>
                </span>
              ),
            )}
        </span>
      ))}
    </>
  );
}

export function place(parts: Array<string | null | undefined>, sep = " · ") {
  return parts.filter(Boolean).join(sep);
}

export function splitDate(iso: string, timezone: string) {
  try {
    const date = new Date(iso);
    return {
      day: new Intl.DateTimeFormat("pt-PT", { day: "2-digit", timeZone: timezone }).format(date),
      month: new Intl.DateTimeFormat("pt-PT", { month: "short", timeZone: timezone })
        .format(date)
        .replace(".", "")
        .toUpperCase(),
    };
  } catch {
    return { day: "--", month: "---" };
  }
}

export interface HandoffChapter {
  text: string;
  mark: string;
  photo: { url: string; alt: string } | null;
}

/** The pop up's embed for a YouTube id. */
export const youtubeEmbed = (videoId: string) => `https://www.youtube-nocookie.com/embed/${videoId}`;

// --- Data derived for the template ---------------------------------------------

export function chaptersOf(snapshot: PageSnapshot, content: SnapshotContent): HandoffChapter[] {
  const photos = content.bioPhotos.length
    ? content.bioPhotos
    : [...content.gallery.filter((item) => !item.videoId).map((item) => item.image), snapshot.images.portrait].filter(
        (image) => image !== null,
      );
  return (snapshot.profile.bio ?? "")
    .split(/\n{2,}/)
    .map((text) => text.trim())
    .filter(Boolean)
    .map((text, i) => {
      const photo = photos.length ? photos[i % photos.length] : null;
      return {
        text,
        mark: content.bioMarks[i] ?? "",
        photo: photo ? { url: photo.url, alt: photo.alt } : null,
      };
    });
}

export function playerOf(snapshot: PageSnapshot) {
  // The artist player first (Spotify "artista"), then any embeddable track.
  return (
    snapshot.tracks.find((track) => track.embed && track.embed.src.includes("/embed/artist/")) ??
    snapshot.tracks.find((track) => track.embed && track.platform !== "youtube") ??
    null
  );
}

/** Whether a section has anything to show; the numbering skips the ones that do not. */
export function hasContent(
  id: SectionId,
  { snapshot, content }: { snapshot: PageSnapshot; content: SnapshotContent },
): boolean {
  switch (id) {
    case "biography":
      return Boolean(snapshot.profile.bio?.trim());
    case "music":
      return snapshot.tracks.length > 0 || content.discography.length > 0;
    case "video":
      return snapshot.videos.length > 0;
    case "gallery":
      return content.gallery.length > 0;
    case "highlights":
      return content.highlights.length > 0;
    case "events":
      return snapshot.events.length > 0;
    case "press":
      return Boolean(
        content.documents.presskit || content.documents.rider || content.documents.folder || snapshot.press.links.length,
      );
    case "booking":
      return snapshot.booking.enabled || Boolean(content.bookingContact);
    case "donations":
      return Boolean(snapshot.campaign);
    case "store":
      return snapshot.products.length > 0;
    default:
      return false;
  }
}


/** "↗︎" drawn as SVG so iOS never swaps it for the emoji glyph. */
export function Ext() {
  return (
    <svg className="mp-ext" viewBox="0 0 12 12" width="0.75em" height="0.75em" aria-hidden="true" style={{ display: "inline-block", verticalAlign: "-0.02em", marginLeft: "0.15em" }}>
      <path d="M3.5 2.5h6v6M9.5 2.5l-7 7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
