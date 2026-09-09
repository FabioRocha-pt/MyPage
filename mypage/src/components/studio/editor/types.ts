import type { EditorCardId, SectionId } from "@/lib/page-model";

/** Shared shapes between the editor cards and the server page that feeds them. */

export interface EditorProfile {
  displayName: string;
  slug: string;
  tagline: string;
  bio: string;
  city: string;
  country: string;
  genres: string;
  realName: string;
  contactEmail: string;
  contactPhone: string;
}

export interface EditorAppearance {
  templateId: string;
  themeMode: "dark" | "light" | "system";
  background: string;
  textColor: string;
  accent: string;
  heroMediaId: string | null;
  portraitMediaId: string | null;
  logoMediaId: string | null;
}

export interface ImageOption {
  id: string;
  title: string;
  viewUrl: string;
}

export interface SelectableItem {
  id: string;
  title: string;
  note: string | null;
}

export interface LinkRow {
  id: string;
  platform: string;
  platformLabel: string;
  mark: string;
  label: string | null;
  url: string;
  group: string;
  placement: string;
  embeddable: boolean;
}

export interface PlatformOption {
  id: string;
  label: string;
  mark: string;
  group: string;
}

export interface PressCategoryRow {
  id: string;
  label: string;
  isDocument: boolean;
  url: string;
  isPublic: boolean;
}

export interface AlbumRow {
  id: string;
  name: string;
  category: string;
  isPublic: boolean;
  mediaCount: number;
}

/** Which public section a card controls; `null` means configuration only. */
export const CARD_SECTION: Record<EditorCardId, SectionId | null> = {
  basic: "biography",
  visual: null,
  press: "press",
  music: "music",
  video: "video",
  booking: "booking",
  events: "events",
  donations: "donations",
  store: "store",
};

/** The plan tool each card depends on, when it depends on one. */
export const CARD_TOOL: Partial<Record<EditorCardId, string>> = {
  press: "press",
  music: "music",
  video: "video",
  booking: "booking",
  events: "events",
  donations: "donations",
  store: "store",
};

/**
 * Where the content behind each card is managed.
 * Doc 02: "A página escolhe conteúdos da biblioteca; uploads e gestão ficam em
 * Áudio." The card selects; the manager owns the content.
 */
export const CARD_MANAGER: Partial<Record<EditorCardId, { href: string; label: string }>> = {
  music: { href: "/studio/audio", label: "Abrir gestão de Áudio" },
  video: { href: "/studio/video", label: "Abrir gestão de Vídeos" },
  booking: { href: "/studio/booking", label: "Abrir gestão de Booking" },
  events: { href: "/studio/events", label: "Abrir gestão de Eventos" },
  donations: { href: "/studio/donations", label: "Abrir gestão de Donativos" },
  store: { href: "/studio/store", label: "Abrir gestão de Merchandising" },
};

/**
 * The prototype's per-card copy (backoffice-v4.js `copy`), kept verbatim where
 * it still describes the behaviour, and corrected where the platform now does
 * more than the prototype could.
 */
export const CARD_COPY: Partial<Record<EditorCardId, string>> = {
  booking:
    "Define se o Booking aparece na tua página. O calendário, a disponibilidade e os pedidos são geridos no menu Booking.",
  events:
    "Aqui defines a visibilidade, a posição e quais os eventos que aparecem. Cartazes, informação e bilhetes são geridos em Eventos, e o catálogo Muska será a origem integrada.",
  donations:
    "Define se a secção de donativos aparece. As campanhas e o progresso são geridos no menu Donativos; receber pagamentos depende da integração SISP.",
  store:
    "Define se a loja aparece. Produtos, stock e encomendas são geridos no menu Merchandising; cobrar depende da integração de pagamentos.",
};
