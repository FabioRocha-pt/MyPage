/**
 * Template catalogue.
 *
 * Doc 01: "Catálogo de templates público e backoffice devem partilhar as mesmas
 * miniaturas e identificadores." One registry, imported by the landing
 * catalogue, the public /templates page and the editor — there is no second
 * list to drift.
 *
 * Doc 01 on thumbnails: "Atualmente usam previews vivos dos HTML, não PNGs
 * estáticos. Se forem necessárias capturas em produção, gerá-las a partir dos
 * templates e versioná-las no mesmo catálogo, sem duplicar manualmente."
 * Each entry therefore carries a `thumbnail` field: today it renders a live
 * React preview, and a generated screenshot can be dropped in later without
 * touching any consumer.
 */

export interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  /** background, text, accent — the palette applied when the template is picked. */
  colors: [string, string, string];
  /** Aspect ratios the template expects, shown as crop guidance in the editor. */
  imageGuidance: {
    hero: string;
    portrait: string;
    note: string;
  };
  /** Optional generated screenshot; live preview is used when absent. */
  thumbnail?: string;
}

export const TEMPLATES: TemplateDefinition[] = [
  {
    id: "01",
    name: "Immersive",
    description: "Hero panorâmico · escuro",
    colors: ["#101724", "#f4f7fb", "#55d5ee"],
    imageGuidance: {
      hero: "21:9 ou 16:9 · horizontal",
      portrait: "4:5 · vertical",
      note: "O banner ocupa o ecrã inteiro com um degradê à esquerda. Mantém o assunto à direita do centro.",
    },
  },
  {
    id: "02",
    name: "Editorial",
    description: "Retrato dividido · editorial",
    colors: ["#f4f0e8", "#201e1b", "#b83d18"],
    imageGuidance: {
      hero: "3:4 · vertical",
      portrait: "3:4 · vertical",
      note: "O hero é dividido ao meio: a fotografia ocupa 47% à esquerda. Fotografias verticais funcionam melhor.",
    },
  },
  {
    id: "03",
    name: "Raw",
    description: "Tipografia forte · recortes",
    colors: ["#eeeae1", "#171714", "#b82c1b"],
    imageGuidance: {
      hero: "livre",
      portrait: "4:5 · vertical",
      note: "Direção editorial crua. O retrato aparece recortado numa grelha assimétrica.",
    },
  },
  {
    id: "04",
    name: "Ember",
    description: "Laranja · composição assimétrica",
    colors: ["#200d05", "#fff6e6", "#ff751f"],
    imageGuidance: {
      hero: "16:9 · horizontal",
      portrait: "1:1 ou 4:5",
      note: "Página enquadrada sobre fundo quente. O título ocupa a esquerda do hero; deixa esse espaço livre.",
    },
  },
  {
    id: "05",
    name: "Portrait",
    description: "Fotografia imersiva · grelha",
    colors: ["#390d18", "#fff4ef", "#ffabb8"],
    imageGuidance: {
      hero: "9:16 ou 3:4 · vertical",
      portrait: "9:16 · vertical",
      note: "Uma única fotografia ocupa todo o ecrã por trás de uma grelha. Mantém o rosto próximo do centro.",
    },
  },
];

const BY_ID = new Map(TEMPLATES.map((t) => [t.id, t]));

export function getTemplate(id: string): TemplateDefinition | undefined {
  return BY_ID.get(id);
}

export function templateOrDefault(id: string): TemplateDefinition {
  return BY_ID.get(id) ?? TEMPLATES[0];
}
