import sys
def edit(p, pairs):
    s = open(p, encoding='utf-8').read()
    for old, new in pairs:
        if old not in s: sys.exit(p + ' NOT FOUND: ' + old[:80])
        s = s.replace(old, new, 1)
    open(p, 'w', encoding='utf-8', newline='\n').write(s)

edit('src/templates/registry.ts', [
('''  {
    id: "03",
    name: "Raw",''', '''  {
    // Página 3 · DJs & Producers, from the Ellputo handoff (2026-10-14). The
    // handoff calls it "Template 06 · Fusion" internally and asks not to
    // overwrite the Raw template (03), so it keeps id 06 and is listed third.
    id: "06",
    name: "DJs & Producers · Página 3",
    description: "Lilás em diagonal · retratos recortados em camadas · etiquetas verticais",
    colors: ["#181819", "#f4f1f5", "#c49aff"],
    imageGuidance: {
      hero: "Recortes PNG com fundo transparente · vertical",
      portrait: "2:3 · vertical",
      note: "O logótipo claro ocupa o lugar do nome no hero (obrigatório nesta página). Até três recortes do artista em camadas: os dois primeiros ficam atrás, a preto e branco; o último à frente. Sem recortes, usa o retrato. As fotografias da biografia alternam no About.",
    },
  },
  {
    id: "03",
    name: "Raw",'''),
('''/** Templates rendered from a My Page handoff: own renderer and a booking page. */
export const HANDOFF_TEMPLATES = new Set(["01", "02"]);''', '''/** Templates rendered from a My Page handoff: own renderer and a booking page. */
export const HANDOFF_TEMPLATES = new Set(["01", "02"]);

/**
 * Templates with a renderer of their own and a fixed bar, but no booking page:
 * Página 3 (06) leads to the booking contacts, it takes no requests.
 */
export const OWN_RENDERER_TEMPLATES = new Set(["01", "02", "06"]);'''),
])

edit('src/templates/PageRenderer.tsx', [
('''import { Template02, type T02Links } from "./t02/Template02";''', '''import { Template02, type T02Links } from "./t02/Template02";
import { Template06 } from "./t06/Template06";'''),
('''  const template = templateOrDefault(snapshot.templateId);
''', '''  const template = templateOrDefault(snapshot.templateId);

  // Página 3 · DJs & Producers (06): one page, booking by contact.
  if (template.id === "06") {
    return <Template06 snapshot={snapshot} links={links ?? { home: "#top", booking: null }} />;
  }
'''),
])

edit('src/app/studio/preview/page.tsx', [
('''import { HANDOFF_TEMPLATES } from "@/templates/registry";''', '''import { HANDOFF_TEMPLATES, OWN_RENDERER_TEMPLATES } from "@/templates/registry";'''),
('''  const fixedBar = handoff;''', '''  const fixedBar = OWN_RENDERER_TEMPLATES.has(snapshot.templateId);'''),
])

edit('src/lib/entitlements.ts', [
('''    allowedTemplates: ["01", "02", "03"],''', '''    allowedTemplates: ["01", "02", "06", "03"],'''),
('''    allowedTemplates: ["01", "02", "03", "04", "05"],''', '''    allowedTemplates: ["01", "02", "06", "03", "04", "05"],'''),
])
print('ok')
