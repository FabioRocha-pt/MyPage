/**
 * Importa a página do DJ Deekay (Template 02 · versão 1) a partir do ficheiro
 * de dados do handoff — `deekay-v1-publicar.zip`, `window.MY_PAGE_ARTISTA` —
 * e publica-a em /p/deekay.
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
 *   npm run db:seed:deekay
 *
 * Pontos que o handoff pede para confirmar antes de publicar a sério, e o
 * valor que ficam a ter aqui (todos editáveis no backoffice):
 *   - rider público na página ............ sim, como no handoff
 *   - telefone do manager visível ........ sim (`mostrarContactoPublico`)
 *   - créditos dos fotógrafos ............ vazios, por confirmar
 *   - nome real .......................... vazio (`nomeReal: null`)
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

const FIXTURES = path.resolve(import.meta.dirname, "fixtures", "deekay");
const EMAIL = "deekay@exemplo.cv";
const PASSWORD = "mypage123";

/** The shape of the handoff's data file, as far as this import reads it. */
interface HandoffArtist {
  slug: string;
  template: string;
  plano: string;
  perfil: {
    nomeArtistico: string;
    nomeReal: string | null;
    frase: string;
    cidade: string;
    pais: string;
    generos: string[];
    biografia: string;
    biografiaMarcas: string[];
  };
  biografiaFotos: string[];
  aparencia: { fundo: string; texto: string; destaque: string };
  imagens: { principal: string; retrato: string; logo: string; logoEscuro: string };
  numeros: Array<{ valor: string; rotulo: string }>;
  links: Array<{ plataforma: string; rotulo: string; url: string; destaque: boolean }>;
  musica: { player: { plataformaUrl: string } };
  discografia: Array<{ titulo: string; com: string | null; url: string | null }>;
  destaques: Array<{ titulo: string; detalhe: string | null; tipo: string | null; ano: string | null; video: string | null }>;
  videos: Array<{ id: string; titulo: string; embed: string }>;
  galeria: Array<{ ficheiro: string; legenda: string }>;
  booking: { responsavel: string; papel: string; telefone: string; whatsapp: boolean; email: string | null; mostrarContactoPublico: boolean };
  rider: {
    tecnico: Array<{ quantidade: string; item: string }>;
    notas: string[];
    esquema: string;
    esquemaLegenda: string;
    hospitalidade: Array<{ quantidade: string; item: string }>;
    bilhetes: string;
    aviso: string[];
    pdf: string;
  };
  presskit: { drive: string; portfolio: string; publico: boolean };
}

const fileName = (asset: string) => path.basename(asset);

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
};

async function importFile(artistId: string, asset: string, albumId: string, position: number) {
  const name = fileName(asset);
  const buffer = await readFile(path.join(FIXTURES, name));
  const ext = path.extname(name).slice(1).toLowerCase();
  const originalKey = makeKey(artistId, ext);
  await put(originalKey, buffer);

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
      mimeType: ext === "png" ? "image/png" : "image/jpeg",
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

  const data = JSON.parse(await readFile(path.join(FIXTURES, "deekay.json"), "utf8")) as HandoffArtist;
  const entitlement = await getEntitlement(data.plano);
  if (entitlement.plan !== data.plano) {
    throw new Error(`O plano "${data.plano}" não existe em PlanEntitlement. Corre primeiro "npm run db:seed".`);
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
  const photoFiles = [...new Set([...data.galeria.map((g) => g.ficheiro), data.imagens.retrato, data.imagens.principal])];
  let position = 0;
  for (const asset of photoFiles) {
    byFile.set(fileName(asset), (await importFile(artist.id, asset, photos.id, position++)).id);
  }
  for (const asset of [data.imagens.logo, data.imagens.logoEscuro]) {
    byFile.set(fileName(asset), (await importFile(artist.id, asset, logos.id, position++)).id);
  }
  byFile.set(fileName(data.rider.esquema), (await importFile(artist.id, data.rider.esquema, plot.id, 0)).id);
  await importFile(artist.id, data.presskit.portfolio, epk.id, 0);
  await importFile(artist.id, data.rider.pdf, riderAlbum.id, 0);

  const mediaId = (asset: string) => {
    const id = byFile.get(fileName(asset));
    if (!id) throw new Error(`Ficheiro sem importação: ${asset}`);
    return id;
  };

  await db.pressLink.create({
    data: { artistId: artist.id, category: "epk", url: data.presskit.drive, isPublic: data.presskit.publico },
  });

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

  const videoIds: string[] = [];
  for (const [index, video] of data.videos.entries()) {
    const row = await db.media.create({
      data: {
        artistId: artist.id,
        title: video.titulo,
        kind: "video",
        mimeType: "text/uri-list",
        externalUrl: video.embed,
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
  const sectionOrder = ["hero", "biography", "music", "video", "gallery", "highlights", "events", "press", "booking", "donations", "store"];
  const sections: Section[] = sectionOrder.map((id, index) => {
    const base = DEFAULT_SECTIONS.find((section) => section.id === id)!;
    return { ...base, position: index, contentIds: id === "video" ? videoIds : [] };
  });

  const content = normaliseContent({
    roleLine: "DJ · Produtor",
    bioMarks: data.perfil.biografiaMarcas,
    bioPhotoIds: data.biografiaFotos.map(mediaId),
    stats: data.numeros.map((n) => ({ value: n.valor, label: n.rotulo })),
    discography: data.discografia.map((d) => ({ title: d.titulo, with: d.com, url: d.url })),
    highlights: data.destaques.map((d) => ({
      title: d.titulo,
      detail: d.detalhe,
      type: d.tipo,
      year: d.ano,
      videoUrl: d.video ? `https://www.youtube.com/watch?v=${d.video}` : null,
    })),
    gallery: data.galeria.map((g) => ({ mediaId: mediaId(g.ficheiro), caption: g.legenda, credit: null })),
    logoDarkMediaId: mediaId(data.imagens.logoEscuro),
    booking: {
      contactName: data.booking.responsavel,
      contactRole: data.booking.papel,
      phone: data.booking.telefone,
      email: data.booking.email,
      whatsapp: data.booking.whatsapp,
      showPublic: data.booking.mostrarContactoPublico,
    },
    rider: {
      isPublic: true,
      technical: data.rider.tecnico.map((r) => ({ qty: r.quantidade, item: r.item })),
      notes: data.rider.notas,
      diagramMediaId: mediaId(data.rider.esquema),
      diagramCaption: data.rider.esquemaLegenda,
      hospitality: data.rider.hospitalidade.map((r) => ({ qty: r.quantidade, item: r.item })),
      guestTickets: data.rider.bilhetes,
      notices: data.rider.aviso,
    },
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

  console.log(`\nPublicado: /p/${snapshot.slug}  e  /p/${snapshot.slug}/booking`);
  if (warnings.length) console.log(`Avisos: ${warnings.join(" · ")}`);
  console.log(`Backoffice: ${EMAIL} / ${PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
