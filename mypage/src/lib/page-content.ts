import { normaliseUrl } from "./platforms";

/**
 * Structured page content.
 *
 * Template 02 · versão 1 (the Deekay page) brought a data contract with more
 * than the original tables hold: biography chapters, a row of numbers, a
 * discography, highlights ("palmarés"), a captioned gallery, the technical and
 * hospitality rider and a public booking contact. None of these is a library
 * item the artist uploads and reuses, so they live as one validated JSON
 * document on the draft instead of seven new tables.
 *
 * Template 01 · versão 1 (the Kevy page, same data contract) added three
 * optional fields: a nickname under the name, a hero logo different from the
 * bar's, and YouTube videos inside the gallery. Discography entries gained a
 * year for the same page.
 *
 * Media is always referenced by id, never by URL, so the snapshot builder can
 * apply the same public/private rule it applies everywhere else.
 *
 * Two fields exist because the handoff (LEIA-ME, "Antes de publicar, confirma
 * comigo") asks for them to be decisions rather than defaults:
 *   - `rider.isPublic`: the rider is on the page, or only on request.
 *   - `booking.showPublic`: the manager's phone can be indexed by Google, or not.
 * Both default to false.
 */

export interface StatItem {
  value: string;
  label: string;
}

export interface DiscographyItem {
  title: string;
  with: string | null;
  year: string | null;
  url: string | null;
}

export interface HighlightItem {
  title: string;
  detail: string | null;
  type: string | null;
  year: string | null;
  /** YouTube link. Opens in the page's pop up and provides the card's image. */
  videoUrl: string | null;
}

/** A photo, or a YouTube video (`videoUrl`, with `mediaId` null) that opens in the pop up. */
export interface GalleryItem {
  mediaId: string | null;
  videoUrl: string | null;
  caption: string | null;
  /** Photographer credit. The handoff lists the credits as still to confirm. */
  credit: string | null;
}

export interface RiderLine {
  qty: string;
  item: string;
}

export interface PageContent {
  /** Short line above the name in the hero, e.g. "DJ · Produtor". */
  roleLine: string | null;
  /** Nickname shown in quotes under the name, e.g. “The Machine”. */
  nickname: string | null;
  /** One mark per biography paragraph ("2018 · Praia"). */
  bioMarks: string[];
  /** One photo per biography paragraph, cycled when there are fewer photos. */
  bioPhotoIds: string[];
  stats: StatItem[];
  discography: DiscographyItem[];
  highlights: HighlightItem[];
  gallery: GalleryItem[];
  /** Logo for light surfaces; sits on the vinyl label in Template 02. */
  logoDarkMediaId: string | null;
  /** Hero logo when it differs from the bar's (Template 01: a stacked mark). */
  logoHeroMediaId: string | null;
  booking: {
    contactName: string | null;
    contactRole: string | null;
    phone: string | null;
    email: string | null;
    whatsapp: boolean;
    showPublic: boolean;
  };
  rider: {
    isPublic: boolean;
    technical: RiderLine[];
    notes: string[];
    diagramMediaId: string | null;
    diagramCaption: string | null;
    hospitality: RiderLine[];
    guestTickets: string | null;
    notices: string[];
  };
}

export const EMPTY_CONTENT: PageContent = {
  roleLine: null,
  nickname: null,
  bioMarks: [],
  bioPhotoIds: [],
  stats: [],
  discography: [],
  highlights: [],
  gallery: [],
  logoDarkMediaId: null,
  logoHeroMediaId: null,
  booking: { contactName: null, contactRole: null, phone: null, email: null, whatsapp: false, showPublic: false },
  rider: {
    isPublic: false,
    technical: [],
    notes: [],
    diagramMediaId: null,
    diagramCaption: null,
    hospitality: [],
    guestTickets: null,
    notices: [],
  },
};

export const CONTENT_LIMITS = {
  bioMarks: 12,
  bioPhotos: 12,
  stats: 6,
  discography: 40,
  highlights: 24,
  gallery: 40,
  riderLines: 30,
  notes: 12,
} as const;

// --- Normalising -------------------------------------------------------------

type Loose = Record<string, unknown>;

const obj = (value: unknown): Loose => (value && typeof value === "object" && !Array.isArray(value) ? (value as Loose) : {});
const arr = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

/** Trims, collapses control characters and caps length. Empty becomes null. */
function text(value: unknown, max: number): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const clean = String(value)
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .trim()
    .slice(0, max);
  return clean || null;
}

function url(value: unknown): string | null {
  const raw = text(value, 500);
  return raw ? normaliseUrl(raw) : null;
}

function id(value: unknown): string | null {
  const raw = text(value, 64);
  return raw && /^[A-Za-z0-9_-]+$/.test(raw) ? raw : null;
}

function strings(value: unknown, limit: number, max: number): string[] {
  return arr(value)
    .map((entry) => text(entry, max))
    .filter((entry): entry is string => Boolean(entry))
    .slice(0, limit);
}

function riderLines(value: unknown): RiderLine[] {
  return arr(value)
    .map((entry) => {
      const row = obj(entry);
      const item = text(row.item, 200);
      return item ? { qty: text(row.qty, 12) ?? "", item } : null;
    })
    .filter((entry): entry is RiderLine => Boolean(entry))
    .slice(0, CONTENT_LIMITS.riderLines);
}

/**
 * Rebuilds a valid document from whatever was stored or sent. Unknown keys are
 * dropped, every string is capped, and URLs go through the same normaliser as
 * the external links, so only http/https survive.
 */
export function normaliseContent(input: unknown): PageContent {
  const raw = obj(input);
  const booking = obj(raw.booking);
  const rider = obj(raw.rider);

  return {
    roleLine: text(raw.roleLine, 60),
    nickname: text(raw.nickname, 60),
    bioMarks: arr(raw.bioMarks)
      .map((entry) => text(entry, 40) ?? "")
      .slice(0, CONTENT_LIMITS.bioMarks),
    bioPhotoIds: arr(raw.bioPhotoIds)
      .map(id)
      .filter((entry): entry is string => Boolean(entry))
      .slice(0, CONTENT_LIMITS.bioPhotos),
    stats: arr(raw.stats)
      .map((entry) => {
        const row = obj(entry);
        const value = text(row.value, 16);
        return value ? { value, label: text(row.label, 60) ?? "" } : null;
      })
      .filter((entry): entry is StatItem => Boolean(entry))
      .slice(0, CONTENT_LIMITS.stats),
    discography: arr(raw.discography)
      .map((entry) => {
        const row = obj(entry);
        const title = text(row.title, 120);
        return title ? { title, with: text(row.with, 120), year: text(row.year, 12), url: url(row.url) } : null;
      })
      .filter((entry): entry is DiscographyItem => Boolean(entry))
      .slice(0, CONTENT_LIMITS.discography),
    highlights: arr(raw.highlights)
      .map((entry) => {
        const row = obj(entry);
        const title = text(row.title, 120);
        return title
          ? {
              title,
              detail: text(row.detail, 240),
              type: text(row.type, 40),
              year: text(row.year, 12),
              videoUrl: url(row.videoUrl),
            }
          : null;
      })
      .filter((entry): entry is HighlightItem => Boolean(entry))
      .slice(0, CONTENT_LIMITS.highlights),
    gallery: arr(raw.gallery)
      .map((entry) => {
        const row = obj(entry);
        const mediaId = id(row.mediaId);
        const videoUrl = mediaId ? null : url(row.videoUrl);
        return mediaId || youtubeId(videoUrl)
          ? { mediaId, videoUrl, caption: text(row.caption, 200), credit: text(row.credit, 120) }
          : null;
      })
      .filter((entry): entry is GalleryItem => Boolean(entry))
      .slice(0, CONTENT_LIMITS.gallery),
    logoDarkMediaId: id(raw.logoDarkMediaId),
    logoHeroMediaId: id(raw.logoHeroMediaId),
    booking: {
      contactName: text(booking.contactName, 80),
      contactRole: text(booking.contactRole, 60),
      phone: text(booking.phone, 40),
      email: text(booking.email, 200),
      whatsapp: booking.whatsapp === true,
      showPublic: booking.showPublic === true,
    },
    rider: {
      isPublic: rider.isPublic === true,
      technical: riderLines(rider.technical),
      notes: strings(rider.notes, CONTENT_LIMITS.notes, 400),
      diagramMediaId: id(rider.diagramMediaId),
      diagramCaption: text(rider.diagramCaption, 300),
      hospitality: riderLines(rider.hospitality),
      guestTickets: text(rider.guestTickets, 200),
      notices: strings(rider.notices, CONTENT_LIMITS.notes, 400),
    },
  };
}

export function readContent(stored: string | null | undefined): PageContent {
  try {
    return normaliseContent(JSON.parse(stored || "{}"));
  } catch {
    return normaliseContent({});
  }
}

/** Every media id the document points at, for ownership checks on write. */
export function contentMediaIds(content: PageContent): string[] {
  return [
    ...content.bioPhotoIds,
    ...content.gallery.map((item) => item.mediaId),
    content.logoDarkMediaId,
    content.logoHeroMediaId,
    content.rider.diagramMediaId,
  ].filter((value): value is string => Boolean(value));
}

// --- Shared helpers ----------------------------------------------------------

/** The 11-character id of a YouTube link, or null. */
export function youtubeId(input: string | null | undefined): string | null {
  const match = String(input ?? "").match(
    /(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/,
  );
  return match ? match[1] : null;
}

export function youtubeThumbnail(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

export const digitsOnly = (value: string | null | undefined) => String(value ?? "").replace(/[^\d]/g, "");
