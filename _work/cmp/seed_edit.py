p = 'prisma/seed-handoff.ts'
s = open(p, encoding='utf8').read()


def rep(a, b):
    global s
    assert a in s, a[:80]
    s = s.replace(a, b, 1)


rep('''/**
 * Importa a página do DJ Deekay (Template 02 · versão 1) a partir do ficheiro
 * de dados do handoff — `deekay-v1-publicar.zip`, `window.MY_PAGE_ARTISTA` —
 * e publica-a em /p/deekay.
''', '''/**
 * Importa a página de um artista a partir do ficheiro de dados de um handoff
 * do My Page (`window.MY_PAGE_ARTISTA`) e publica-a em /p/<slug>:
 *
 *   - deekay · Template 02 · versão 1 (`deekay-v1-publicar.zip`)
 *   - kevy   · Template 01 · versão 1 (`kevy-v1-publicar.zip`)
 *
 * Os dois handoffs têm o mesmo contrato de dados; o do Kevy acrescenta três
 * campos opcionais (`imagens.logoHero`, `galeria[].video`, `perfil.alcunha`) e
 * o ano de cada lançamento.
''')
rep(''' *   npm run db:seed:deekay
 *
 * Pontos que o handoff pede para confirmar antes de publicar a sério, e o
 * valor que ficam a ter aqui (todos editáveis no backoffice):
 *   - rider público na página ............ sim, como no handoff
 *   - telefone do manager visível ........ sim (`mostrarContactoPublico`)
 *   - créditos dos fotógrafos ............ vazios, por confirmar
 *   - nome real .......................... vazio (`nomeReal: null`)
 */''', ''' *   npm run db:seed:deekay     (tsx prisma/seed-handoff.ts deekay)
 *   npm run db:seed:kevy       (tsx prisma/seed-handoff.ts kevy)
 *
 * Pontos que os handoffs pedem para confirmar antes de publicar a sério, e o
 * valor que ficam a ter aqui (todos editáveis no backoffice):
 *   - rider público na página ............ sim, como nos handoffs
 *   - telefone do manager visível ........ o que diz `mostrarContactoPublico`
 *                                          (Deekay sim; o Kevy ainda não tem contacto)
 *   - créditos dos fotógrafos ............ vazios, por confirmar
 *   - `porConfirmar` do ficheiro ......... listado no fim da importação
 */''')
rep('''const FIXTURES = path.resolve(import.meta.dirname, "fixtures", "deekay");
const EMAIL = "deekay@exemplo.cv";
const PASSWORD = "mypage123";''', '''const SLUG = process.argv[2];
if (!SLUG || !/^[a-z0-9-]+$/.test(SLUG)) {
  console.error("Uso: tsx prisma/seed-handoff.ts <slug>   (deekay, kevy)");
  process.exit(1);
}
const FIXTURES = path.resolve(import.meta.dirname, "fixtures", SLUG);
const EMAIL = `${SLUG}@exemplo.cv`;
const PASSWORD = "mypage123";''')
rep('''    nomeArtistico: string;
    nomeReal: string | null;''', '''    nomeArtistico: string;
    alcunha?: string | null;
    nomeReal: string | null;''')
rep('''  imagens: { principal: string; retrato: string; logo: string; logoEscuro: string };''',
    '''  imagens: { principal: string; retrato: string; logo: string; logoEscuro: string; logoHero?: string | null };''')
rep('''  discografia: Array<{ titulo: string; com: string | null; url: string | null }>;''',
    '''  discografia: Array<{ titulo: string; com: string | null; ano?: string | null; url: string | null }>;''')
rep('''  galeria: Array<{ ficheiro: string; legenda: string }>;
  booking: { responsavel: string; papel: string; telefone: string; whatsapp: boolean; email: string | null; mostrarContactoPublico: boolean };''',
    '''  /** A photo (`ficheiro`) or a YouTube video (`video`, an id or a link). */
  galeria: Array<{ ficheiro?: string; video?: string; legenda: string }>;
  booking: {
    responsavel: string | null;
    papel: string | null;
    telefone: string | null;
    whatsapp: boolean;
    email: string | null;
    mostrarContactoPublico: boolean;
  };''')
rep('''    bilhetes: string;''', '''    bilhetes: string | null;''')
rep('''  presskit: { drive: string; portfolio: string; publico: boolean };
}''', '''  presskit: { drive: string; portfolio: string; publico: boolean };
  porConfirmar?: string[];
}''')
rep('''/** Titles double as download file names (Content-Disposition), so they keep the extension. */''',
    '''/** Titles double as download file names (Content-Disposition), so they keep the extension. */''')
rep('''  "deekay-rider-tecnico.pdf": "DJ Deekay · Rider técnico e hospitalidade.pdf",
};''', '''  "deekay-rider-tecnico.pdf": "DJ Deekay · Rider técnico e hospitalidade.pdf",
  "kevy-principal.jpg": "Fotografia principal.jpg",
  "kevy-retrato.jpg": "Retrato de promoção.jpg",
  "kevy-laranja.jpg": "Retrato de estúdio.jpg",
  "kevy-palco.jpg": "Na cabine.jpg",
  "kevy-esquema.jpg": "Diagrama de equipamento.jpg",
  "kevy-logo.png": "Logo.png",
  "kevy-logo-empilhado.png": "Logo empilhado.png",
  "kevy-monograma-escuro.png": "Monograma escuro.png",
  "kevy-presskit.pdf": "DJ Kevy Delgado · Press kit.pdf",
  "kevy-rider-tecnico.pdf": "DJ Kevy Delgado · Rider técnico e hospitalidade.pdf",
};''')
rep('''const fileName = (asset: string) => path.basename(asset);''', '''const fileName = (asset: string) => path.basename(asset);
/** The handoff stores a YouTube id or a link; the content document keeps links. */
const youtubeUrl = (value: string) => (/^https?:/i.test(value) ? value : `https://www.youtube.com/watch?v=${value}`);''')
rep('''  const data = JSON.parse(await readFile(path.join(FIXTURES, "deekay.json"), "utf8")) as HandoffArtist;''',
    '''  const data = JSON.parse(await readFile(path.join(FIXTURES, `${SLUG}.json`), "utf8")) as HandoffArtist;
  if (data.slug !== SLUG) throw new Error(`fixtures/${SLUG}/${SLUG}.json tem slug "${data.slug}".`);''')
rep('''  const photoFiles = [...new Set([...data.galeria.map((g) => g.ficheiro), data.imagens.retrato, data.imagens.principal])];''',
    '''  const photoFiles = [
    ...new Set([
      ...data.galeria.flatMap((g) => (g.ficheiro ? [g.ficheiro] : [])),
      ...data.biografiaFotos,
      data.imagens.retrato,
      data.imagens.principal,
    ]),
  ];''')
rep('''  for (const asset of [data.imagens.logo, data.imagens.logoEscuro]) {''',
    '''  const logoFiles = [data.imagens.logo, data.imagens.logoHero, data.imagens.logoEscuro].filter(
    (asset): asset is string => Boolean(asset),
  );
  for (const asset of new Set(logoFiles)) {''')
rep('''    roleLine: "DJ · Produtor",''', '''    roleLine: "DJ · Produtor",
    nickname: data.perfil.alcunha ?? null,''')
rep('''    discography: data.discografia.map((d) => ({ title: d.titulo, with: d.com, url: d.url })),''',
    '''    discography: data.discografia.map((d) => ({ title: d.titulo, with: d.com, year: d.ano ?? null, url: d.url })),''')
rep('''    gallery: data.galeria.map((g) => ({ mediaId: mediaId(g.ficheiro), caption: g.legenda, credit: null })),
    logoDarkMediaId: mediaId(data.imagens.logoEscuro),''', '''    gallery: data.galeria.map((g) => ({
      mediaId: g.ficheiro ? mediaId(g.ficheiro) : null,
      videoUrl: g.ficheiro || !g.video ? null : youtubeUrl(g.video),
      caption: g.legenda,
      credit: null,
    })),
    logoDarkMediaId: mediaId(data.imagens.logoEscuro),
    logoHeroMediaId:
      data.imagens.logoHero && data.imagens.logoHero !== data.imagens.logo ? mediaId(data.imagens.logoHero) : null,''')
rep('''  if (warnings.length) console.log(`Avisos: ${warnings.join(" · ")}`);''',
    '''  if (warnings.length) console.log(`Avisos: ${warnings.join(" · ")}`);
  if (data.porConfirmar?.length) console.log(`Por confirmar com o artista:\\n  - ${data.porConfirmar.join("\\n  - ")}`);''')
open(p, 'w', encoding='utf8', newline='\n').write(s)

p = 'package.json'
s = open(p, encoding='utf8').read()
a = '''    "db:seed:deekay": "tsx prisma/seed-deekay.ts",'''
assert a in s
s = s.replace(a, '''    "db:seed:deekay": "tsx prisma/seed-handoff.ts deekay",
    "db:seed:kevy": "tsx prisma/seed-handoff.ts kevy",''')
open(p, 'w', encoding='utf8', newline='\n').write(s)
