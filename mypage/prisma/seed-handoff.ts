/**
 * Importa a página de um artista a partir do ficheiro de dados de um handoff
 * do My Page (`window.MY_PAGE_ARTISTA`) e publica-a em /p/<slug>:
 *
 *   - deekay  · Template 02 · versão 1 (`deekay-v1-publicar.zip`)
 *   - kevy    · Template 01 · versão 1 (`kevy-v1-publicar.zip`)
 *   - ellputo · Página 3 · DJs & Producers, template 06
 *               (`Entrega-Fabio-Pagina-03-DJs-Producers-2026-10-14.zip`)
 *
 * Os dois handoffs têm o mesmo contrato de dados; o do Kevy acrescenta três
 * campos opcionais (`imagens.logoHero`, `galeria[].video`, `perfil.alcunha`) e
 * o ano de cada lançamento.
 *
 * A entrega da Página 3 não trazia ficheiro de dados: `fixtures/ellputo/
 * ellputo.json` foi escrito a partir do `site/index.html`, no mesmo contrato,
 * com o bloco `pagina3` para o que só essa página mostra (recortes do hero,
 * percurso, colaborações, Stories, filme da galeria, emails por região). Os
 * dois vídeos locais entram otimizados (H.264, faststart), não os originais.
 * Ellputo não tem rider nem pasta do Drive: esses campos são opcionais.
 *
 * O LEIA-ME do handoff diz: "É este ficheiro que o backoffice vai passar a
 * produzir." Este script faz o caminho inverso uma vez: pega nesse JSON e
 * distribui-o pelas tabelas da plataforma (artista, biblioteca, álbuns, links,
 * vídeos, rascunho), para a página passar a ser editada no backoffice como
 * qualquer outra. As fotografias e os PDF entram pelo mesmo pipeline dos
 * uploads (original + derivado WebP).
 *
 * Idempotente: se o artista já existir, é apagado (com os ficheiros) e criado
 * de novo a partir do JSON.
 *
 *   npm run db:seed:deekay     (tsx prisma/seed-handoff.ts deekay)
 *   npm run db:seed:kevy       (tsx prisma/seed-handoff.ts kevy)
 *   npm run db:seed:ellputo    (tsx prisma/seed-handoff.ts ellputo)
 *
 * Pontos que os handoffs pedem para confirmar antes de publicar a sério, e o
 * valor que ficam a ter aqui (todos editáveis no backoffice):
 *   - rider público na página ............ sim, como nos handoffs
 *   - telefone do manager visível ........ o que diz `mostrarContactoPublico`
 *                                          (Deekay sim; o Kevy ainda não tem contacto)
 *   - créditos dos fotógrafos ............ vazios, por confirmar
 *   - `porConfirmar` do ficheiro ......... listado no fim da importação
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth";
import { getEntitlement } from "../src/lib/entitlements";
import { normaliseContent } from "../src/lib/page-content";
import { DEFAULT_SECTIONS, type EditorCardId, type Section } from "../src/lib/page-model";
import { buildSnapshot } from "../src/lib/snapshot";
import { imageMeta, makeImageDerivative, makeKey, put, remove } from "../src/lib/storage";
import { assertTargetDatabase } from "./seed-utils";

const db = new PrismaClient();

const SLUG = process.argv[2];
if (!SLUG || !/^[a-z0-9-]+$/.test(SLUG)) {
  console.error("Uso: tsx prisma/seed-handoff.ts <slug>   (deekay, kevy, ellputo)");
  process.exit(1);
}
const FIXTURES = path.resolve(import.meta.dirname, "fixtures", SLUG);
const EMAIL = `${SLUG}@exemplo.cv`;
const PASSWORD = "mypage123";

/** The shape of the handoff's data file, as far as this import reads it. */
interface HandoffArtist {
  slug: string;
  template: string;
  plano: string;
  perfil: {
    nomeArtistico: string;
    alcunha?: string | null;
    nomeReal: string | null;
    frase: string;
    /** Line above the name (`roleLine`). Defaults to "DJ · Produtor". */
    funcao?: string | null;
    cidade: string;
    pais: string;
    generos: string[];
    biografia: string;
    biografiaMarcas: string[];
  };
  biografiaFotos: string[];
  aparencia: { fundo: string; texto: string; destaque: string };
  imagens: { principal: string; retrato: string; logo: string; logoEscuro?: string | null; logoHero?: string | null };
  numeros: Array<{ valor: string; rotulo: string; url?: string | null }>;
  links: Array<{ plataforma: string; rotulo: string; url: string; destaque: boolean }>;
  musica: {
    player: { plataformaUrl: string };
    /** More music links, listed beside the player (Página 3). */
    outras?: Array<{ plataforma: string; rotulo: string; url: string }>;
  };
  discografia: Array<{ titulo: string; com: string | null; ano?: string | null; tipo?: string | null; url: string | null }>;
  destaques: Array<{ titulo: string; detalhe: string | null; tipo: string | null; ano: string | null; video: string | null }>;
  /** Deekay/Kevy: `id` + `embed`. Ellputo: a link (a playlist too) and a cover image. */
  videos: Array<{ id?: string; titulo: string; embed?: string; url?: string; capa?: string }>;
  /** A photo (`ficheiro`) or a YouTube video (`video`, an id or a link). */
  galeria: Array<{ ficheiro?: string; video?: string; legenda: string }>;
  booking: {
    responsavel: string | null;
    papel: string | null;
    telefone: string | null;
    whatsapp: boolean;
    email: string | null;
    mostrarContactoPublico: boolean;
    regioes?: Array<{ rotulo: string; email: string }>;
  };
  rider: {
    tecnico: Array<{ quantidade: string; item: string }>;
    notas: string[];
    esquema: string;
    esquemaLegenda: string;
    hospitalidade: Array<{ quantidade: string; item: string }>;
    bilhetes: string | null;
    aviso: string[];
    pdf: string;
  } | null;
  presskit: { drive: string | null; portfolio: string; publico: boolean };
  /** Página 3 · DJs & Producers (template 06) only. */
  pagina3?: {
    fraseHero: string | null;
    recortesHero: string[];
    faixa: string[];
    origemNumeros: string | null;
    factos: Array<{ valor: string; rotulo: string }>;
    percurso: Array<{ periodo: string; titulo: string; texto: string | null }>;
    colaboracoes: Array<{ rotulo: string; nomes: string }>;
    fotoMusica: string | null;
    fotoPremios: string | null;
    stories: {
      video: string | null;
      tituloVideo: string | null;
      capa: string | null;
      foto: string | null;
      legendaFoto: string | null;
      tipografia: string | null;
      introducao: string | null;
      notaCreditos: string | null;
      creditos: Array<{ ano: string | null; titulo: string; cliente: string | null }>;
    };
    filmeGaleria: { video: string; titulo: string | null; capa: string | null } | null;
  };
  porConfirmar?: string[];
}

const fileName = (asset: string) => path.basename(asset);
/** The handoff stores a YouTube id or a link; the content document keeps links. */
const youtubeUrl = (value: string) => (/^https?:/i.test(value) ? value : `https://www.youtube.com/watch?v=${value}`);

/** Titles double as download file names (Content-Disposition), so they keep the extension. */
const TITLES: Record<string, string> = {
  "deekay-retrato.jpg": "Retrato de promoção.jpg",
  "deekay-cabine.jpg": "Na cabine.jpg",
  "deekay-publico.jpg": "Com o público.jpg",
  "deekay-palco.jpg": "Palco principal.jpg",
  "deekay-estudio.jpg": "Retrato de estúdio.jpg",
  "deekay-esquema.jpg": "Esquema de ligações.jpg",
  "deekay-logo.png": "Logo claro.png",
  "deekay-logo-escuro.png": "Logo escuro.png",
  "deekay-presskit.pdf": "DJ Deekay · Press kit.pdf",
  "deekay-rider-tecnico.pdf": "DJ Deekay · Rider técnico e hospitalidade.pdf",
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
  "ellputo-logo.png": "Logo.png",
  "ellputo-logo-hero.png": "Logo do hero.png",
  "ellputo-recorte-1.png": "Recorte 1.png",
  "ellputo-recorte-2.png": "Recorte 2.png",
  "ellputo-recorte-3.png": "Recorte principal.png",
  "ellputo-artist-profile.pdf": "Ellputo · Artist profile.pdf",
  "ellputo-artist-reel.mp4": "Artist reel.mp4",
  "ellputo-music-experience.mp4": "Ellputo Music Experience.mp4",
};

const MIME: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", mp4: "video/mp4" };

async function importFile(artistId: string, asset: string, albumId: string | null, position: number) {
  const name = fileName(asset);
  const buffer = await readFile(path.join(FIXTURES, name));
  const ext = path.extname(name).slice(1).toLowerCase();
  const originalKey = makeKey(artistId, ext);
  await put(originalKey, buffer);

  if (ext === "mp4") {
    // A local film (Página 3). Stored as is: the fixture is already the web
    // encode, and the view route serves it in byte ranges.
    return db.media.create({
      data: {
        artistId,
        albumId,
        title: TITLES[name] ?? name,
        kind: "video",
        mimeType: MIME.mp4,
        originalKey,
        sizeBytes: buffer.length,
        status: "ready",
        isPublic: true,
        position,
      },
    });
  }

  if (ext === "pdf") {
    return db.media.create({
      data: {
        artistId,
        albumId,
        title: TITLES[name] ?? name,
        kind: "document",
        mimeType: "application/pdf",
        originalKey,
        sizeBytes: buffer.length,
        status: "ready",
        isPublic: true,
        position,
      },
    });
  }

  const derivative = await makeImageDerivative(buffer, artistId);
  const meta = await imageMeta(buffer);
  return db.media.create({
    data: {
      artistId,
      albumId,
      title: TITLES[name] ?? name,
      kind: "image",
      mimeType: MIME[ext] ?? "image/jpeg",
      originalKey,
      derivedKey: derivative?.key ?? null,
      sizeBytes: buffer.length,
      derivedBytes: derivative?.bytes ?? null,
      width: meta?.width ?? null,
      height: meta?.height ?? null,
      status: "ready",
      isPublic: true,
      position,
    },
  });
}

/** Removes a previous import, stored files included. */
async function removeExisting(slug: string) {
  const existing = await db.artist.findUnique({ where: { slug }, select: { id: true } });
  if (!existing) return;
  const files = await db.media.findMany({
    where: { artistId: existing.id },
    select: { originalKey: true, derivedKey: true },
  });
  for (const file of files) {
    await remove(file.originalKey);
    await remove(file.derivedKey);
  }
  await db.artist.delete({ where: { id: existing.id } });
  console.log(`  · importação anterior de /${slug} apagada (${files.length} ficheiros).`);
}

async function main() {
  assertTargetDatabase();

  const data = JSON.parse(await readFile(path.join(FIXTURES, `${SLUG}.json`), "utf8")) as HandoffArtist;
  if (data.slug !== SLUG) throw new Error(`fixtures/${SLUG}/${SLUG}.json tem slug "${data.slug}".`);
  const entitlement = await getEntitlement(data.plano);
  if (entitlement.plan !== data.plano) {
    throw new Error(`O plano "${data.plano}" não existe em PlanEntitlement. Corre primeiro "npm run db:seed".`);
  }
  if (!entitlement.allowedTemplates.includes(data.template)) {
    throw new Error(
      `O plano "${data.plano}" ainda não inclui o template ${data.template}. Corre primeiro "npm run db:seed" para atualizar os planos.`,
    );
  }

  console.log(`A importar ${data.perfil.nomeArtistico} (/${data.slug}, template ${data.template}, plano ${data.plano})…`);
  await removeExisting(data.slug);

  const account = await db.account.upsert({
    where: { email: EMAIL },
    update: { passwordHash: hashPassword(PASSWORD) },
    create: { email: EMAIL, passwordHash: hashPassword(PASSWORD), displayName: data.perfil.nomeArtistico },
  });

  const artist = await db.artist.create({
    data: {
      slug: data.slug,
      displayName: data.perfil.nomeArtistico,
      tagline: data.perfil.frase,
      bio: data.perfil.biografia,
      city: data.perfil.cidade,
      country: data.perfil.pais,
      genres: data.perfil.generos.join(", "),
      realName: data.perfil.nomeReal,
      contactEmail: EMAIL,
      // The manager's number also stays in the private field, where it is
      // never published; the public copy lives in the booking contact below.
      contactPhone: data.booking.telefone,
      plan: data.plano,
      memberships: { create: { accountId: account.id, role: "owner" } },
    },
  });

  // --- Library ---------------------------------------------------------------

  console.log("  · fotografias, logótipos e PDF…");
  const album = (name: string, category: string, position: number) =>
    db.album.create({ data: { artistId: artist.id, name, category, isPublic: true, position } });

  const photos = await album("Fotografias de imprensa", "press-photos", 0);
  const logos = await album("Logos", "logos", 1);
  const plot = await album("Stage plot", "stage-plot", 2);
  const epk = await album("Biografia / EPK", "epk", 3);
  const riderAlbum = await album("Rider técnico", "tech-rider", 4);

  const byFile = new Map<string, string>();
  const p3 = data.pagina3;
  const photoFiles = [
    ...new Set(
      [
        ...data.galeria.flatMap((g) => (g.ficheiro ? [g.ficheiro] : [])),
        ...data.biografiaFotos,
        data.imagens.retrato,
        data.imagens.principal,
        ...(p3?.recortesHero ?? []),
        p3?.fotoMusica,
        p3?.fotoPremios,
        p3?.stories.capa,
        p3?.stories.foto,
        p3?.filmeGaleria?.capa,
      ].filter((asset): asset is string => Boolean(asset)),
    ),
  ];
  let position = 0;
  for (const asset of photoFiles) {
    byFile.set(fileName(asset), (await importFile(artist.id, asset, photos.id, position++)).id);
  }
  const logoFiles = [data.imagens.logo, data.imagens.logoHero, data.imagens.logoEscuro].filter(
    (asset): asset is string => Boolean(asset),
  );
  for (const asset of new Set(logoFiles)) {
    byFile.set(fileName(asset), (await importFile(artist.id, asset, logos.id, position++)).id);
  }
  if (data.rider) {
    byFile.set(fileName(data.rider.esquema), (await importFile(artist.id, data.rider.esquema, plot.id, 0)).id);
    await importFile(artist.id, data.rider.pdf, riderAlbum.id, 0);
  }
  await importFile(artist.id, data.presskit.portfolio, epk.id, 0);

  // Local films (Página 3): library videos without an album, public.
  const films = [p3?.stories.video, p3?.filmeGaleria?.video].filter((asset): asset is string => Boolean(asset));
  for (const [index, asset] of films.entries()) {
    byFile.set(fileName(asset), (await importFile(artist.id, asset, null, 100 + index)).id);
  }

  const mediaId = (asset: string) => {
    const id = byFile.get(fileName(asset));
    if (!id) throw new Error(`Ficheiro sem importação: ${asset}`);
    return id;
  };

  if (data.presskit.drive) {
    await db.pressLink.create({
      data: { artistId: artist.id, category: "epk", url: data.presskit.drive, isPublic: data.presskit.publico },
    });
  }

  // --- Links and videos --------------------------------------------------------

  console.log("  · redes, player e vídeos…");
  let linkPosition = 0;
  for (const link of data.links) {
    await db.externalLink.create({
      data: {
        artistId: artist.id,
        platform: link.plataforma,
        label: link.rotulo,
        url: link.url,
        group: "social",
        // "destaque" in the handoff is the hero row of icons.
        placement: link.destaque ? "both" : "section",
        position: linkPosition++,
      },
    });
  }
  // The player in "Ouve agora." is a music link; the platform resolves the embed.
  await db.externalLink.create({
    data: {
      artistId: artist.id,
      platform: "spotify",
      label: "Spotify",
      url: data.musica.player.plataformaUrl,
      group: "music",
      placement: "section",
      position: 0,
    },
  });
  for (const [index, link] of (data.musica.outras ?? []).entries()) {
    await db.externalLink.create({
      data: {
        artistId: artist.id,
        platform: link.plataforma,
        label: link.rotulo,
        url: link.url,
        group: "music",
        placement: "section",
        position: index + 1,
      },
    });
  }

  const videoIds: string[] = [];
  for (const [index, video] of data.videos.entries()) {
    // A cover from the handoff becomes the video's derivative, which is what
    // the snapshot publishes as `poster` (a playlist has no YouTube thumbnail).
    const cover = video.capa
      ? await makeImageDerivative(await readFile(path.join(FIXTURES, fileName(video.capa))), artist.id)
      : null;
    const row = await db.media.create({
      data: {
        artistId: artist.id,
        title: video.titulo,
        kind: "video",
        mimeType: "text/uri-list",
        externalUrl: video.url ?? video.embed!,
        derivedKey: cover?.key ?? null,
        derivedBytes: cover?.bytes ?? null,
        platform: "youtube",
        status: "ready",
        isPublic: true,
        position: index,
      },
    });
    videoIds.push(row.id);
  }

  // --- Draft -------------------------------------------------------------------

  // The handoff's page order. Editor cards follow it so the editor and the page agree.
  const editorOrder: EditorCardId[] = [
    "basic",
    "visual",
    "music",
    "video",
    "gallery",
    "highlights",
    "events",
    "press",
    "booking",
    "rider",
    "donations",
    "store",
  ];
  const sectionOrder =
    data.template === "01"
      ? ["hero", "music", "video", "biography", "highlights", "gallery", "events", "press", "booking", "donations", "store"]
      : data.template === "06"
        ? ["hero", "biography", "music", "highlights", "video", "gallery", "events", "press", "booking", "donations", "store"]
        : ["hero", "biography", "music", "video", "gallery", "highlights", "events", "press", "booking", "donations", "store"];
  const sections: Section[] = sectionOrder.map((id, index) => {
    const base = DEFAULT_SECTIONS.find((section) => section.id === id)!;
    return { ...base, position: index, contentIds: id === "video" ? videoIds : [] };
  });

  const optionalId = (asset: string | null | undefined) => (asset ? mediaId(asset) : null);
  const content = normaliseContent({
    roleLine: data.perfil.funcao ?? "DJ · Produtor",
    nickname: data.perfil.alcunha ?? null,
    bioMarks: data.perfil.biografiaMarcas,
    bioPhotoIds: data.biografiaFotos.map(mediaId),
    stats: data.numeros.map((n) => ({ value: n.valor, label: n.rotulo, url: n.url ?? null })),
    discography: data.discografia.map((d) => ({ title: d.titulo, with: d.com, year: d.ano ?? null, url: d.url, type: d.tipo ?? null })),
    highlights: data.destaques.map((d) => ({
      title: d.titulo,
      detail: d.detalhe,
      type: d.tipo,
      year: d.ano,
      videoUrl: d.video ? `https://www.youtube.com/watch?v=${d.video}` : null,
    })),
    gallery: data.galeria.map((g) => ({
      mediaId: g.ficheiro ? mediaId(g.ficheiro) : null,
      videoUrl: g.ficheiro || !g.video ? null : youtubeUrl(g.video),
      caption: g.legenda,
      credit: null,
    })),
    logoDarkMediaId: optionalId(data.imagens.logoEscuro),
    logoHeroMediaId:
      data.imagens.logoHero && data.imagens.logoHero !== data.imagens.logo ? mediaId(data.imagens.logoHero) : null,
    booking: {
      contactName: data.booking.responsavel,
      contactRole: data.booking.papel,
      phone: data.booking.telefone,
      email: data.booking.email,
      whatsapp: data.booking.whatsapp,
      showPublic: data.booking.mostrarContactoPublico,
      regions: (data.booking.regioes ?? []).map((r) => ({ label: r.rotulo, email: r.email })),
    },
    rider: data.rider
      ? {
          isPublic: true,
          technical: data.rider.tecnico.map((r) => ({ qty: r.quantidade, item: r.item })),
          notes: data.rider.notas,
          diagramMediaId: mediaId(data.rider.esquema),
          diagramCaption: data.rider.esquemaLegenda,
          hospitality: data.rider.hospitalidade.map((r) => ({ qty: r.quantidade, item: r.item })),
          guestTickets: data.rider.bilhetes,
          notices: data.rider.aviso,
        }
      : { isPublic: false },
    ...(p3
      ? {
          heroPhotoIds: p3.recortesHero.map(mediaId),
          heroStatement: p3.fraseHero,
          ticker: p3.faixa,
          statsNote: p3.origemNumeros,
          facts: p3.factos.map((f) => ({ value: f.valor, label: f.rotulo })),
          timeline: p3.percurso.map((t) => ({ period: t.periodo, title: t.titulo, text: t.texto })),
          collaborations: p3.colaboracoes.map((c) => ({ label: c.rotulo, names: c.nomes })),
          musicPhotoId: optionalId(p3.fotoMusica),
          highlightsPhotoId: optionalId(p3.fotoPremios),
          stories: {
            reelMediaId: optionalId(p3.stories.video),
            posterMediaId: optionalId(p3.stories.capa),
            photoMediaId: optionalId(p3.stories.foto),
            reelTitle: p3.stories.tituloVideo,
            photoCaption: p3.stories.legendaFoto,
            statement: p3.stories.tipografia,
            intro: p3.stories.introducao,
            creditsNote: p3.stories.notaCreditos,
            credits: p3.stories.creditos.map((c) => ({ year: c.ano, title: c.titulo, client: c.cliente })),
          },
          galleryFilm: p3.filmeGaleria
            ? {
                mediaId: mediaId(p3.filmeGaleria.video),
                posterMediaId: optionalId(p3.filmeGaleria.capa),
                title: p3.filmeGaleria.titulo,
              }
            : {},
        }
      : {}),
  });

  await db.pageDraft.create({
    data: {
      artistId: artist.id,
      templateId: data.template,
      themeMode: "dark",
      background: data.aparencia.fundo,
      textColor: data.aparencia.texto,
      accent: data.aparencia.destaque,
      heroMediaId: mediaId(data.imagens.principal),
      portraitMediaId: mediaId(data.imagens.retrato),
      logoMediaId: mediaId(data.imagens.logo),
      editorOrder: JSON.stringify(editorOrder),
      sections: JSON.stringify(sections),
      content: JSON.stringify(content),
      version: 1,
    },
  });

  // --- Publish -----------------------------------------------------------------

  const { snapshot, warnings, errors } = await buildSnapshot(artist.id, { mode: "publish" });
  if (errors.length) throw new Error(`A página não pode ser publicada: ${errors.join(" · ")}`);
  await db.publishedPage.create({
    data: { artistId: artist.id, slug: snapshot.slug, snapshot: JSON.stringify({ ...snapshot, version: 1 }), version: 1, isLive: true },
  });

  // Página 3 (06) has no booking page: it leads to the contacts.
  const bookingPage = data.template === "06" ? "" : `  e  /p/${snapshot.slug}/booking`;
  console.log(`\nPublicado: /p/${snapshot.slug}${bookingPage}`);
  if (warnings.length) console.log(`Avisos: ${warnings.join(" · ")}`);
  if (data.porConfirmar?.length) console.log(`Por confirmar com o artista:\n  - ${data.porConfirmar.join("\n  - ")}`);
  console.log(`Backoffice: ${EMAIL} / ${PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
