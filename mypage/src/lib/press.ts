/**
 * Press-kit categories.
 * Doc 02: "Categorias iniciais: fotos de imprensa, fotos ao vivo, logos,
 * vídeos promocionais, visuais LED, biografia/EPK, rider técnico, rider de
 * hospitalidade e stage plot. Permitir álbuns com nome/categoria e evolução
 * para categorias próprias."
 */

export interface PressCategory {
  id: string;
  label: string;
  /** Riders get a direct open/download button rather than a gallery. */
  isDocument: boolean;
}

export const PRESS_CATEGORIES: PressCategory[] = [
  { id: "press-photos", label: "Fotografias de imprensa", isDocument: false },
  { id: "live-photos", label: "Fotografias ao vivo", isDocument: false },
  { id: "logos", label: "Logos", isDocument: false },
  { id: "promo-videos", label: "Vídeos promocionais", isDocument: false },
  { id: "led-visuals", label: "Visuais / LED", isDocument: false },
  { id: "epk", label: "Biografia / EPK", isDocument: true },
  { id: "tech-rider", label: "Rider técnico", isDocument: true },
  { id: "hospitality-rider", label: "Rider de hospitalidade", isDocument: true },
  { id: "stage-plot", label: "Stage plot", isDocument: true },
];

const BY_ID = new Map(PRESS_CATEGORIES.map((c) => [c.id, c]));

export function pressCategory(id: string): PressCategory | undefined {
  return BY_ID.get(id);
}

export function pressCategoryLabel(id: string): string {
  return BY_ID.get(id)?.label ?? id;
}

/** Custom categories are allowed; only the shape is constrained. */
export function isValidCategory(id: string): boolean {
  return BY_ID.has(id) || (/^[a-z0-9][a-z0-9-]{1,40}$/.test(id) && id.length <= 40);
}

/**
 * Wording required by doc 02 whenever a shared folder link is made public:
 * "Aviso explícito: qualquer pessoa com o link deve conseguir aceder aos
 * ficheiros."
 */
export const SHARED_LINK_WARNING =
  "Qualquer pessoa com este link consegue aceder aos ficheiros. Confirma as permissões da pasta antes de a tornares pública.";
