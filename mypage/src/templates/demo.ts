import { evaluatePalette } from "@/lib/colors";
import { DEFAULT_SECTIONS, type PageSnapshot, type SnapshotImage } from "@/lib/page-model";
import { templateOrDefault } from "./registry";

/**
 * Demonstration content for the template catalogue.
 *
 * Doc 01: "Catálogo de templates público e backoffice devem partilhar as mesmas
 * miniaturas e identificadores. Atualmente usam previews vivos dos HTML, não
 * PNGs estáticos." The prototype rendered each thumbnail as a shrunken iframe of
 * `dj-template-NN.html`; here the equivalent is a shrunken iframe of
 * `/templates/NN`, which renders the real template through `PageRenderer`.
 *
 * Doc 01 also warns: "Fotos e nomes de demonstração não representam clientes ou
 * conteúdos aprovados para produção." Nothing here is a real artist: the name is
 * generic and the imagery is the landing's own reference material.
 */

const DEMO_IMAGES = {
  hero: "/landing/showcase-main.webp",
  portrait: "/landing/showcase-a.webp",
  gallery: "/landing/gallery-editorial.webp",
};

const demoImage = (url: string, alt: string, width = 1400, height = 1000): SnapshotImage => ({
  mediaId: `demo-${url}`,
  url,
  width,
  height,
  alt,
});

const DEMO_GALLERY = [
  demoImage("/landing/showcase-main.webp", "Palco de demonstração"),
  demoImage("/landing/showcase-a.webp", "Retrato de demonstração", 1200, 1500),
  demoImage("/landing/gallery-editorial.webp", "Imagem editorial de demonstração"),
  demoImage("/landing/showcase-b.webp", "Cabine de demonstração"),
  demoImage("/landing/gallery-experimental.webp", "Imagem experimental de demonstração"),
];

export function demoSnapshot(templateId: string): PageSnapshot {
  const template = templateOrDefault(templateId);
  const [background, text, accent] = template.colors;
  const palette = evaluatePalette({ background, text, accent });

  return {
    version: 0,
    publishedAt: "2026-01-01T20:00:00.000Z",
    artistId: "demo",
    slug: `template-${template.id}`,
    templateId: template.id,
    profile: {
      displayName: "Nome do Artista",
      tagline: "Demonstração do template · conteúdo não real",
      bio: "Este texto substitui a biografia do artista. Serve apenas para mostrar como o template trata blocos longos de texto, espaçamento e ritmo de leitura. O conteúdo real vem do editor.\n\nCada parágrafo é um capítulo. No template 02 a fotografia ao lado muda com o capítulo que está a ser lido.\n\nOs números, a discografia, o palmarés e a galeria também são de demonstração: nada disto representa um artista real.",
      city: "Praia",
      country: "Cabo Verde",
      genres: ["Afro House", "Amapiano", "Funaná"],
    },
    appearance: {
      mode: "dark",
      background,
      text,
      accent,
      accentText: palette.derived.accentText,
      accentHover: palette.derived.accentHover,
      surface: palette.derived.surface,
      surfaceRaised: palette.derived.surfaceRaised,
      line: palette.derived.line,
      muted: palette.derived.muted,
      overlay: palette.derived.overlay,
    },
    images: {
      hero: { mediaId: "demo-hero", url: DEMO_IMAGES.hero, width: 1600, height: 900, alt: "Imagem de demonstração" },
      portrait: {
        mediaId: "demo-portrait",
        url: DEMO_IMAGES.portrait,
        width: 1200,
        height: 1500,
        alt: "Retrato de demonstração",
      },
      logo: null,
    },
    sections: DEFAULT_SECTIONS.map((section) => ({ ...section })),
    links: [
      { platform: "instagram", label: "Instagram", mark: "IG", url: "https://instagram.com", placement: "both" },
      { platform: "spotify", label: "Spotify", mark: "SP", url: "https://open.spotify.com", placement: "section" },
      { platform: "soundcloud", label: "SoundCloud", mark: "SC", url: "https://soundcloud.com", placement: "section" },
    ],
    tracks: [
      {
        id: "demo-track-1",
        title: "Set de demonstração · 60 min",
        platform: "soundcloud",
        platformLabel: "SoundCloud",
        mark: "SC",
        url: "https://soundcloud.com",
        embed: null,
        fileUrl: null,
        placement: "both",
      },
      {
        id: "demo-track-2",
        title: "Single de demonstração",
        platform: "spotify",
        platformLabel: "Spotify",
        mark: "SP",
        url: "https://open.spotify.com",
        embed: null,
        fileUrl: null,
        placement: "section",
      },
    ],
    videos: [
      {
        id: "demo-video-1",
        title: "Aftermovie de demonstração",
        platform: "youtube",
        url: "https://youtube.com",
        embed: null,
        fileUrl: null,
        poster: DEMO_IMAGES.gallery,
      },
    ],
    events: [
      {
        id: "demo-event-1",
        title: "Noite de demonstração",
        startsAt: "2026-11-14T23:00:00.000Z",
        timezone: "Atlantic/Cape_Verde",
        venue: "Sala de exemplo",
        city: "Praia",
        country: "Cabo Verde",
        description: "Data de demonstração para mostrar como os eventos aparecem no template.",
        ticketsUrl: null,
        poster: DEMO_IMAGES.gallery,
      },
    ],
    press: { albums: [], links: [] },
    booking: { enabled: true, availability: [] },
    campaign: null,
    products: [],
    branding: { showMyPageBadge: true },
    content: {
      roleLine: "DJ · Produtor",
      bioMarks: ["Hoje", "Capítulos", "Demonstração"],
      bioPhotos: DEMO_GALLERY.slice(0, 3),
      stats: [
        { value: "12", label: "países de demonstração" },
        { value: "2018", label: "ano de exemplo" },
        { value: "40+", label: "datas fictícias" },
      ],
      discography: [
        { title: "Tema de demonstração", with: "Convidado", url: null },
        { title: "Outro tema", with: null, url: null },
        { title: "Remix de exemplo", with: "Produtor", url: null },
      ],
      highlights: [
        { title: "Festival de demonstração", detail: "Palco principal", type: "Festival", year: "2026", videoId: null, image: null },
        { title: "Prémio de exemplo", detail: "Nomeação fictícia", type: "Nomeação", year: "2025", videoId: null, image: null },
        { title: "Marco de exemplo", detail: "Conteúdo não real", type: "Destaque", year: null, videoId: null, image: null },
      ],
      gallery: DEMO_GALLERY.map((image) => ({ image, downloadUrl: image.url, caption: image.alt, credit: null })),
      logoDark: null,
      bookingContact: null,
      rider: null,
      documents: { presskit: null, rider: null, folder: null },
    },
  };
}
