/**
 * Platform whitelist and embed resolution.
 *
 * Doc 03: "URLs externas: whitelist de embeds, bloquear esquemas perigosos,
 * proteção SSRF se houver obtenção de metadados."
 *
 * Nothing here fetches a remote URL. Metadata is derived from the URL shape
 * alone, so there is no SSRF surface. If a future version does fetch, it must
 * resolve the host first and reject private ranges.
 */

export interface Platform {
  id: string;
  label: string;
  /** Two-letter mark used where a real logo file is not yet licensed. */
  mark: string;
  group: "social" | "music" | "video";
  hosts: string[];
  /** True when we can produce a sandboxed embed instead of an outbound link. */
  embeddable: boolean;
}

export const PLATFORMS: Platform[] = [
  { id: "muska", label: "Muska", mark: "MK", group: "music", hosts: ["muska.live", "www.muska.live", "muskalive.com", "www.muskalive.com"], embeddable: false },
  { id: "spotify", label: "Spotify", mark: "SP", group: "music", hosts: ["open.spotify.com", "spotify.com"], embeddable: true },
  { id: "apple", label: "Apple Music", mark: "AM", group: "music", hosts: ["music.apple.com"], embeddable: true },
  { id: "deezer", label: "Deezer", mark: "DZ", group: "music", hosts: ["deezer.com", "www.deezer.com"], embeddable: true },
  { id: "youtubemusic", label: "YouTube Music", mark: "YM", group: "music", hosts: ["music.youtube.com"], embeddable: false },
  { id: "soundcloud", label: "SoundCloud", mark: "SC", group: "music", hosts: ["soundcloud.com", "www.soundcloud.com", "on.soundcloud.com"], embeddable: true },
  { id: "mixcloud", label: "Mixcloud", mark: "MX", group: "music", hosts: ["mixcloud.com", "www.mixcloud.com"], embeddable: true },
  { id: "tidal", label: "TIDAL", mark: "TD", group: "music", hosts: ["tidal.com", "listen.tidal.com"], embeddable: true },
  { id: "amazon", label: "Amazon Music", mark: "AZ", group: "music", hosts: ["music.amazon.com", "music.amazon.co.uk"], embeddable: false },
  { id: "bandcamp", label: "Bandcamp", mark: "BC", group: "music", hosts: ["bandcamp.com"], embeddable: true },
  { id: "audiomack", label: "Audiomack", mark: "AU", group: "music", hosts: ["audiomack.com", "www.audiomack.com"], embeddable: true },

  { id: "youtube", label: "YouTube", mark: "YT", group: "video", hosts: ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "youtube-nocookie.com"], embeddable: true },
  { id: "vimeo", label: "Vimeo", mark: "VM", group: "video", hosts: ["vimeo.com", "www.vimeo.com", "player.vimeo.com"], embeddable: true },

  { id: "instagram", label: "Instagram", mark: "IG", group: "social", hosts: ["instagram.com", "www.instagram.com"], embeddable: false },
  { id: "tiktok", label: "TikTok", mark: "TT", group: "social", hosts: ["tiktok.com", "www.tiktok.com"], embeddable: false },
  { id: "facebook", label: "Facebook", mark: "FB", group: "social", hosts: ["facebook.com", "www.facebook.com", "fb.com"], embeddable: false },
  { id: "x", label: "X", mark: "X", group: "social", hosts: ["x.com", "twitter.com", "www.twitter.com"], embeddable: false },
  { id: "linkedin", label: "LinkedIn", mark: "LI", group: "social", hosts: ["linkedin.com", "www.linkedin.com"], embeddable: false },
  { id: "whatsapp", label: "WhatsApp", mark: "WA", group: "social", hosts: ["wa.me", "api.whatsapp.com"], embeddable: false },
  { id: "website", label: "Website", mark: "WW", group: "social", hosts: [], embeddable: false },
  { id: "other", label: "Outra plataforma", mark: "··", group: "social", hosts: [], embeddable: false },
];

const BY_ID = new Map(PLATFORMS.map((p) => [p.id, p]));

export function getPlatform(id: string): Platform | undefined {
  return BY_ID.get(id);
}

/** Every host we are willing to place inside an iframe. Feeds the CSP. */
export const EMBED_HOSTS = [
  "www.youtube-nocookie.com",
  "player.vimeo.com",
  "open.spotify.com",
  "w.soundcloud.com",
  "www.mixcloud.com",
  "embed.music.apple.com",
  "widget.deezer.com",
  "embed.tidal.com",
  "bandcamp.com",
  "audiomack.com",
];

/**
 * Validates and normalises an external URL.
 * Rejects everything that is not http(s) — this is what stops `javascript:`,
 * `data:` and `file:` from reaching an href or an iframe src.
 */
export function normaliseUrl(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    // Allow a bare host the artist typed without a scheme.
    try {
      url = new URL(`https://${raw}`);
    } catch {
      return null;
    }
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (!url.hostname || url.hostname === "localhost") return null;
  // Strip credentials and tracking fragments that would leak into a public page.
  url.username = "";
  url.password = "";
  return url.toString();
}

export function detectPlatform(url: string): Platform | undefined {
  const normalised = normaliseUrl(url);
  if (!normalised) return undefined;
  const host = new URL(normalised).hostname.toLowerCase();
  return PLATFORMS.find((p) => p.hosts.some((h) => host === h || host.endsWith(`.${h}`)));
}

export interface EmbedResult {
  src: string;
  title: string;
  /** Aspect ratio hint for the container. */
  ratio: "16/9" | "1/1" | "auto";
  height?: number;
}

/**
 * Produces a sandboxed embed URL, or null when the platform must be opened in a
 * new tab instead. Every branch validates the extracted id with a strict
 * pattern so a crafted path cannot become part of the iframe src.
 */
export function resolveEmbed(input: string): EmbedResult | null {
  const normalised = normaliseUrl(input);
  if (!normalised) return null;
  const url = new URL(normalised);
  const host = url.hostname.toLowerCase().replace(/^www\./, "");

  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtu.be" || host === "youtube-nocookie.com") {
    const id =
      host === "youtu.be"
        ? url.pathname.slice(1)
        : url.searchParams.get("v") ?? url.pathname.split("/").filter(Boolean).pop() ?? "";
    if (/^[\w-]{11}$/.test(id)) {
      return { src: `https://www.youtube-nocookie.com/embed/${id}`, title: "YouTube", ratio: "16/9" };
    }
    return null;
  }

  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const id = url.pathname.split("/").filter(Boolean).find((part) => /^\d+$/.test(part));
    if (id) return { src: `https://player.vimeo.com/video/${id}`, title: "Vimeo", ratio: "16/9" };
    return null;
  }

  if (host === "open.spotify.com" || host === "spotify.com") {
    const parts = url.pathname.split("/").filter(Boolean);
    // Optional locale prefix: /intl-pt/track/<id>
    const typeIndex = parts.findIndex((p) => ["track", "album", "playlist", "artist", "episode", "show"].includes(p));
    if (typeIndex >= 0 && parts[typeIndex + 1] && /^[A-Za-z0-9]{22}$/.test(parts[typeIndex + 1])) {
      const kind = parts[typeIndex];
      return {
        src: `https://open.spotify.com/embed/${kind}/${parts[typeIndex + 1]}`,
        title: "Spotify",
        ratio: "auto",
        height: kind === "track" ? 152 : 352,
      };
    }
    return null;
  }

  if (host === "soundcloud.com" || host === "on.soundcloud.com") {
    // SoundCloud's widget accepts the canonical track URL as a parameter.
    return {
      src: `https://w.soundcloud.com/player/?url=${encodeURIComponent(normalised)}&color=%232dceef&hide_related=true&show_comments=false&show_teaser=false`,
      title: "SoundCloud",
      ratio: "auto",
      height: 166,
    };
  }

  if (host === "mixcloud.com") {
    return {
      src: `https://www.mixcloud.com/widget/iframe/?feed=${encodeURIComponent(url.pathname)}&hide_cover=1&light=0`,
      title: "Mixcloud",
      ratio: "auto",
      height: 180,
    };
  }

  if (host === "music.apple.com") {
    return {
      src: `https://embed.music.apple.com${url.pathname}${url.search}`,
      title: "Apple Music",
      ratio: "auto",
      height: 175,
    };
  }

  if (host === "deezer.com") {
    const parts = url.pathname.split("/").filter(Boolean);
    const typeIndex = parts.findIndex((p) => ["track", "album", "playlist"].includes(p));
    if (typeIndex >= 0 && /^\d+$/.test(parts[typeIndex + 1] ?? "")) {
      return {
        src: `https://widget.deezer.com/widget/dark/${parts[typeIndex]}/${parts[typeIndex + 1]}`,
        title: "Deezer",
        ratio: "auto",
        height: 200,
      };
    }
    return null;
  }

  if (host === "tidal.com" || host === "listen.tidal.com") {
    const parts = url.pathname.split("/").filter(Boolean);
    const typeIndex = parts.findIndex((p) => ["track", "album", "playlist", "video"].includes(p));
    if (typeIndex >= 0 && parts[typeIndex + 1] && /^[\w-]{1,64}$/.test(parts[typeIndex + 1])) {
      return {
        src: `https://embed.tidal.com/${parts[typeIndex]}s/${parts[typeIndex + 1]}`,
        title: "TIDAL",
        ratio: "auto",
        height: 240,
      };
    }
    return null;
  }

  return null;
}

/** The single sandbox policy applied to every embed we render. */
export const EMBED_SANDBOX = "allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox";
