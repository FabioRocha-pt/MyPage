/**
 * Muska catalogue adapter.
 *
 * Doc 03, first paragraph: "Não foi fornecido repositório, stack, documentação
 * privada ou credenciais Muska/SISP. Não inferir endpoints a partir dos URLs
 * públicos."
 *
 * So this file does not call muska.live. It defines the interface the real
 * adapter must implement and ships a `pending` implementation that reports the
 * integration as unavailable — which is exactly what doc 04's checklist item 8
 * requires: "pesquisa Muska informa integração pendente".
 *
 * To connect the real catalogue: implement `MuskaAdapter` against the official
 * documentation, set MUSKA_API_URL / MUSKA_API_KEY, and return it from
 * `getMuskaAdapter()`. Nothing else in the codebase needs to change.
 */

export interface MuskaArtist {
  id: string;
  name: string;
  imageUrl: string | null;
  profileUrl: string;
  city: string | null;
  country: string | null;
}

export interface MuskaTrack {
  id: string;
  title: string;
  artistId: string;
  url: string;
  durationSec: number | null;
  releasedAt: string | null;
}

export interface MuskaVideo {
  id: string;
  title: string;
  artistId: string;
  url: string;
  thumbnailUrl: string | null;
}

export interface MuskaEvent {
  externalId: string;
  title: string;
  startsAt: string;
  timezone: string;
  venue: string | null;
  city: string | null;
  country: string | null;
  description: string | null;
  ticketsUrl: string | null;
  posterUrl: string | null;
}

export interface MuskaPage<T> {
  items: T[];
  total: number;
  page: number;
  perPage: number;
}

export interface AdapterStatus {
  connected: boolean;
  /** Shown verbatim in the UI. Never claims a connection that does not exist. */
  message: string;
}

export interface MuskaAdapter {
  status(): AdapterStatus;
  searchArtists(query: string, page?: number): Promise<MuskaPage<MuskaArtist>>;
  getArtist(muskaId: string): Promise<MuskaArtist | null>;
  listTracks(muskaId: string, page?: number): Promise<MuskaPage<MuskaTrack>>;
  listVideos(muskaId: string, page?: number): Promise<MuskaPage<MuskaVideo>>;
  listEvents(muskaId: string, page?: number): Promise<MuskaPage<MuskaEvent>>;
}

export class MuskaUnavailableError extends Error {
  readonly status = 503;
  constructor(message = "Integração Muska pendente. O catálogo real ainda não está ligado.") {
    super(message);
    this.name = "MuskaUnavailableError";
  }
}

const emptyPage = <T>(page = 1): MuskaPage<T> => ({ items: [], total: 0, page, perPage: 24 });

const pendingAdapter: MuskaAdapter = {
  status: () => ({
    connected: false,
    message:
      "Integração Muska pendente: falta documentação da API, credenciais e ambiente de testes. Nenhum artista foi associado.",
  }),
  async searchArtists() {
    throw new MuskaUnavailableError();
  },
  async getArtist() {
    return null;
  },
  async listTracks(_muskaId, page = 1) {
    return emptyPage<MuskaTrack>(page);
  },
  async listVideos(_muskaId, page = 1) {
    return emptyPage<MuskaVideo>(page);
  },
  async listEvents(_muskaId, page = 1) {
    return emptyPage<MuskaEvent>(page);
  },
};

export function getMuskaAdapter(): MuskaAdapter {
  // When MUSKA_API_URL and MUSKA_API_KEY exist, return the real adapter here.
  return pendingAdapter;
}

/**
 * Public reference URLs recorded in referencias/LEIA-ME.md.
 * Doc 01: "«Explorar artistas» deve abrir https://muskalive.com, conforme
 * último pedido. Não trocar automaticamente pelo domínio de referência
 * anterior."
 */
export const MUSKA_URLS = {
  explore: "https://muskalive.com",
  catalogue: "https://www.muska.live/en/artists",
  freeProfileExample:
    "https://www.muska.live/en/artists/7618d975-55ef-4faf-9f16-5d8a0286d0af#biography",
} as const;

/**
 * Reconciliation rule for imported events.
 * Doc 02: "Definir como eventos manuais são migrados/reconciliados para não
 * duplicar registos."
 *
 * A Muska event is matched by (source, externalId) — the schema's unique index.
 * A manual event is considered the same show when the title matches
 * case-insensitively and the start time is within `TOLERANCE_MINUTES`; the
 * caller then upgrades the manual row to source="muska" instead of inserting.
 */
export const RECONCILE_TOLERANCE_MINUTES = 180;

export function looksLikeSameEvent(
  manual: { title: string; startsAt: Date },
  incoming: { title: string; startsAt: Date },
): boolean {
  const sameTitle =
    manual.title.trim().toLowerCase() === incoming.title.trim().toLowerCase();
  const deltaMinutes =
    Math.abs(manual.startsAt.getTime() - incoming.startsAt.getTime()) / 60000;
  return sameTitle && deltaMinutes <= RECONCILE_TOLERANCE_MINUTES;
}
