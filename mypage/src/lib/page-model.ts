/**
 * The page contract.
 *
 * Doc 02 is explicit that the prototype conflates two different lists inside a
 * single `layout` array and that they must be separated:
 *
 *   "`Informações básicas` contém a biografia, mas também configura o hero.
 *    `Imagens e cores` é configuração e não uma secção pública. Separar no
 *    modelo definitivo `editorOrder` de `sectionOrder`. O protótipo mistura
 *    ambos em `layout`; não o transportar sem adaptação."
 *
 * So:
 *   editorOrder — the order of cards inside the backoffice. Includes `visual`,
 *                 which configures appearance and renders nothing publicly.
 *   sections    — what the public page actually renders, with enabled/position.
 */

export const EDITOR_CARDS = [
  { id: "basic", label: "Informações básicas", hint: "Identidade, biografia e ligações públicas", configuration: false },
  { id: "visual", label: "Imagens e cores", hint: "Template, fotografias e paleta da página", configuration: true },
  { id: "press", label: "Press kit", hint: "Álbuns, links partilhados e riders", configuration: false },
  { id: "music", label: "Músicas e sets", hint: "Conteúdos Muska ou ligações de outras plataformas", configuration: false },
  { id: "video", label: "Vídeos", hint: "Vídeos da biblioteca e links permitidos", configuration: false },
  { id: "booking", label: "Booking", hint: "Formulário de pedidos e disponibilidade", configuration: false },
  { id: "events", label: "Eventos · Muska", hint: "Escolhe os eventos que aparecem na página", configuration: false },
  { id: "donations", label: "Donativos", hint: "Campanha de apoio e progresso", configuration: false },
  { id: "store", label: "Merchandising", hint: "Produtos digitais e físicos", configuration: false },
] as const;

export type EditorCardId = (typeof EDITOR_CARDS)[number]["id"];

export const DEFAULT_EDITOR_ORDER: EditorCardId[] = EDITOR_CARDS.map((c) => c.id);

/**
 * Public sections. `hero` is separate from `biography`: doc 02 notes that
 * "Informações básicas" feeds both, and asks whether the hero stays pinned.
 * It is modelled as a normal section with `pinned: true` so the answer can
 * change without a migration.
 */
export const SECTION_TYPES = [
  { id: "hero", label: "Hero", pinned: true, tool: null },
  { id: "biography", label: "Biografia", pinned: false, tool: null },
  { id: "press", label: "Press kit", pinned: false, tool: "press" },
  { id: "music", label: "Músicas e sets", pinned: false, tool: "music" },
  { id: "video", label: "Vídeos", pinned: false, tool: "video" },
  { id: "booking", label: "Booking", pinned: false, tool: "booking" },
  { id: "events", label: "Eventos", pinned: false, tool: "events" },
  { id: "donations", label: "Donativos", pinned: false, tool: "donations" },
  { id: "store", label: "Merchandising", pinned: false, tool: "store" },
] as const;

export type SectionId = (typeof SECTION_TYPES)[number]["id"];

export interface Section {
  id: SectionId;
  enabled: boolean;
  position: number;
  /** Ids of the media / events / products selected for this section. */
  contentIds: string[];
  /** Optional per-section heading override. */
  title?: string;
}

export const DEFAULT_SECTIONS: Section[] = SECTION_TYPES.map((type, index) => ({
  id: type.id,
  // Donations and store stay off until their flow is approved (doc 02).
  enabled: !["donations", "store"].includes(type.id),
  position: index,
  contentIds: [],
}));

export function isSectionId(value: string): value is SectionId {
  return SECTION_TYPES.some((s) => s.id === value);
}

export function isEditorCardId(value: string): value is EditorCardId {
  return EDITOR_CARDS.some((c) => c.id === value);
}

export function sectionMeta(id: SectionId) {
  return SECTION_TYPES.find((s) => s.id === id)!;
}

// --- Parsing / normalising ---------------------------------------------------

/**
 * Rebuilds a valid section list from whatever is stored, dropping unknown ids
 * and re-numbering positions. Pinned sections are forced to the front so the
 * hero cannot be pushed below the fold by a hand-edited payload.
 */
export function normaliseSections(input: unknown): Section[] {
  const raw = Array.isArray(input) ? input : [];
  const seen = new Set<string>();
  const parsed: Section[] = [];

  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const candidate = entry as Record<string, unknown>;
    const id = typeof candidate.id === "string" ? candidate.id : "";
    if (!isSectionId(id) || seen.has(id)) continue;
    seen.add(id);
    parsed.push({
      id,
      enabled: candidate.enabled !== false,
      position: typeof candidate.position === "number" ? candidate.position : parsed.length,
      contentIds: Array.isArray(candidate.contentIds)
        ? candidate.contentIds.filter((c): c is string => typeof c === "string").slice(0, 200)
        : [],
      title: typeof candidate.title === "string" && candidate.title.trim() ? candidate.title.trim().slice(0, 80) : undefined,
    });
  }

  // Append any section the stored payload did not know about yet.
  for (const type of SECTION_TYPES) {
    if (!seen.has(type.id)) {
      parsed.push({
        id: type.id,
        enabled: !["donations", "store"].includes(type.id),
        position: parsed.length,
        contentIds: [],
      });
    }
  }

  parsed.sort((a, b) => {
    const pinnedA = sectionMeta(a.id).pinned ? 0 : 1;
    const pinnedB = sectionMeta(b.id).pinned ? 0 : 1;
    return pinnedA - pinnedB || a.position - b.position;
  });

  return parsed.map((section, index) => ({ ...section, position: index }));
}

export function normaliseEditorOrder(input: unknown): EditorCardId[] {
  const raw = Array.isArray(input) ? input : [];
  const seen = new Set<EditorCardId>();
  const order: EditorCardId[] = [];

  for (const entry of raw) {
    const id = typeof entry === "string" ? entry : "";
    if (isEditorCardId(id) && !seen.has(id)) {
      seen.add(id);
      order.push(id);
    }
  }
  for (const card of EDITOR_CARDS) {
    if (!seen.has(card.id)) order.push(card.id);
  }
  return order;
}

// --- The published snapshot --------------------------------------------------

export interface SnapshotImage {
  mediaId: string;
  /** Public derivative path. Always served through /api/media/<id>/view. */
  url: string;
  width: number | null;
  height: number | null;
  alt: string;
}

export interface SnapshotLink {
  platform: string;
  label: string;
  mark: string;
  url: string;
  placement: "hero" | "section" | "both";
}

export interface SnapshotTrack {
  id: string;
  title: string;
  platform: string | null;
  platformLabel: string | null;
  mark: string | null;
  url: string | null;
  /** Present only for whitelisted, sandboxable platforms. */
  embed: { src: string; ratio: string; height?: number } | null;
  /** Present for files uploaded to the library and marked public. */
  fileUrl: string | null;
  placement: "hero" | "section" | "both";
}

export interface SnapshotVideo {
  id: string;
  title: string;
  platform: string | null;
  url: string | null;
  embed: { src: string; ratio: string; height?: number } | null;
  fileUrl: string | null;
  poster: string | null;
}

export interface SnapshotEvent {
  id: string;
  title: string;
  startsAt: string;
  timezone: string;
  venue: string | null;
  city: string | null;
  country: string | null;
  description: string | null;
  ticketsUrl: string | null;
  poster: string | null;
}

export interface SnapshotAlbum {
  id: string;
  name: string;
  category: string;
  items: Array<{ id: string; title: string; kind: string; url: string; downloadUrl: string | null }>;
}

export interface SnapshotPressLink {
  category: string;
  url: string;
}

export interface SnapshotProduct {
  id: string;
  title: string;
  description: string;
  type: "digital" | "physical";
  image: string | null;
  currency: string;
  shippingMinor: number | null;
  shippingInfo: string | null;
  variants: Array<{ id: string; name: string; priceMinor: number; stock: number | null }>;
}

export interface SnapshotCampaign {
  id: string;
  title: string;
  description: string;
  goalMinor: number;
  /** Confirmed payments only (doc 02). */
  raisedMinor: number;
  currency: string;
  videoUrl: string | null;
  videoEmbed: { src: string; ratio: string; height?: number } | null;
  donors: Array<{ name: string; amountMinor: number; message: string | null }>;
}

export interface PageSnapshot {
  version: number;
  publishedAt: string;
  artistId: string;
  slug: string;
  templateId: string;
  profile: {
    displayName: string;
    tagline: string | null;
    bio: string | null;
    city: string | null;
    country: string | null;
    genres: string[];
  };
  appearance: {
    mode: "dark" | "light" | "system";
    background: string;
    text: string;
    accent: string;
    accentText: string;
    accentHover: string;
    surface: string;
    surfaceRaised: string;
    line: string;
    muted: string;
    overlay: string;
  };
  images: {
    hero: SnapshotImage | null;
    portrait: SnapshotImage | null;
    logo: SnapshotImage | null;
  };
  sections: Section[];
  links: SnapshotLink[];
  tracks: SnapshotTrack[];
  videos: SnapshotVideo[];
  events: SnapshotEvent[];
  press: { albums: SnapshotAlbum[]; links: SnapshotPressLink[] };
  booking: { enabled: boolean; availability: Array<{ start: string; end: string; status: string }> };
  campaign: SnapshotCampaign | null;
  products: SnapshotProduct[];
  branding: { showMyPageBadge: boolean };
}
