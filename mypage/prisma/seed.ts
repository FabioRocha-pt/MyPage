/**
 * Seeds a working local environment: plan entitlements, one demo account with
 * an artist, and the prototype's own imagery imported through the real media
 * pipeline (original + WebP derivative) so the templates render actual content.
 *
 * Doc 01: "Fotos e nomes de demonstração não representam clientes ou conteúdos
 * aprovados para produção." Everything created here is labelled as demo data.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth";
import { PLAN_SEED } from "../src/lib/entitlements";
import { DEFAULT_EDITOR_ORDER, DEFAULT_SECTIONS } from "../src/lib/page-model";
import { imageMeta, makeImageDerivative, makeKey, put } from "../src/lib/storage";

const db = new PrismaClient();

/** The handoff folder, relative to this project. */
const HANDOFF = path.resolve(
  process.cwd(),
  "..",
  "My-Page-Developer-Handoff-2026-09-08",
  "My-Page-Developer-Handoff-2026-09-08",
  "prototipo",
  "assets",
);

async function importImage(
  artistId: string,
  fileName: string,
  title: string,
  albumId: string | null,
  isPublic: boolean,
) {
  let buffer: Buffer;
  try {
    buffer = await readFile(path.join(HANDOFF, fileName));
  } catch {
    console.warn(`  · ${fileName} não encontrado no handoff — ignorado.`);
    return null;
  }

  const originalKey = makeKey(artistId, path.extname(fileName).slice(1) || "png");
  await put(originalKey, buffer);

  const derivative = await makeImageDerivative(buffer, artistId);
  const meta = await imageMeta(buffer);

  return db.media.create({
    data: {
      artistId,
      albumId,
      title,
      kind: "image",
      mimeType: "image/png",
      originalKey,
      derivedKey: derivative?.key ?? null,
      sizeBytes: buffer.length,
      derivedBytes: derivative?.bytes ?? null,
      width: meta?.width ?? null,
      height: meta?.height ?? null,
      status: "ready",
      isPublic,
    },
  });
}

async function main() {
  console.log("A preparar planos…");
  for (const plan of PLAN_SEED) {
    await db.planEntitlement.upsert({
      where: { plan: plan.plan },
      update: {
        label: plan.label,
        priceMinor: plan.priceMinor,
        currency: plan.currency,
        tools: JSON.stringify(plan.tools),
        maxMediaItems: plan.maxMediaItems,
        maxStorageMb: plan.maxStorageMb,
        maxEvents: plan.maxEvents,
        maxProducts: plan.maxProducts,
        allowedTemplates: JSON.stringify(plan.allowedTemplates),
        customDomain: plan.customDomain,
        removeBranding: plan.removeBranding,
      },
      create: {
        plan: plan.plan,
        label: plan.label,
        priceMinor: plan.priceMinor,
        currency: plan.currency,
        tools: JSON.stringify(plan.tools),
        maxMediaItems: plan.maxMediaItems,
        maxStorageMb: plan.maxStorageMb,
        maxEvents: plan.maxEvents,
        maxProducts: plan.maxProducts,
        allowedTemplates: JSON.stringify(plan.allowedTemplates),
        customDomain: plan.customDomain,
        removeBranding: plan.removeBranding,
      },
    });
  }

  // The team account. Created before the demo-account early return below, so
  // it also lands on a database that was seeded before this account existed.
  // It holds no membership on purpose: staff read any artist through the
  // `platformRole` path in lib/auth `requireArtistAccess`, not through one.
  const admin = await db.account.upsert({
    where: { email: "admin@mypage.cv" },
    update: { platformRole: "staff" },
    create: {
      email: "admin@mypage.cv",
      passwordHash: hashPassword("admin123"),
      displayName: "Equipa My Page",
      platformRole: "staff",
    },
  });
  console.log(`Conta de equipa pronta: ${admin.email} (platformRole=${admin.platformRole})`);

  const existing = await db.account.findUnique({ where: { email: "artista@exemplo.cv" } });
  if (existing) {
    console.log("Conta de demonstração já existe. Nada a fazer.");
    return;
  }

  console.log("A criar conta de demonstração…");
  const account = await db.account.create({
    data: {
      email: "artista@exemplo.cv",
      passwordHash: hashPassword("mypage123"),
      displayName: "Conta de demonstração",
      phone: "+238 000 00 00",
    },
  });

  // Premium so every tool is reachable while testing. Doc 01 warns the plan
  // benefits themselves are still to be validated commercially.
  const artist = await db.artist.create({
    data: {
      slug: "kairo",
      displayName: "KAIRO",
      tagline: "Movimento sem fronteiras. Percussão, pressão e energia de madrugada.",
      bio: "KAIRO transforma o ritmo cabo-verdiano em música de clube virada para a frente. Os seus sets viajam do Afro House percussivo à pressão eletrónica mais profunda, sempre ligados à sala que tem à frente.\n\nCom base na Praia e disponível internacionalmente, o seu trabalho junta cultura de clube, identidade cabo-verdiana e uma curiosidade constante por novos sons.",
      city: "Praia",
      country: "Cabo Verde",
      genres: "Afro House, Amapiano, Electronic",
      realName: "Nome real de demonstração",
      contactEmail: "artista@exemplo.cv",
      contactPhone: "+238 000 00 00",
      plan: "premium",
      memberships: { create: { accountId: account.id, role: "owner" } },
    },
  });

  console.log("A importar imagens do protótipo…");
  const pressAlbum = await db.album.create({
    data: {
      artistId: artist.id,
      name: "Fotografias de imprensa",
      category: "press-photos",
      isPublic: true,
      position: 0,
    },
  });

  const hero = await importImage(artist.id, "dj-template-01-hero.png", "Hero panorâmico", pressAlbum.id, true);
  const portrait = await importImage(artist.id, "dj-template-02-hero.png", "Retrato editorial", pressAlbum.id, true);
  await importImage(artist.id, "dj-template-04-ember.png", "Ember · luz quente", pressAlbum.id, true);
  await importImage(artist.id, "dj-template-05-portrait.png", "Retrato dominante", pressAlbum.id, true);

  console.log("A criar rascunho da página…");
  const sections = DEFAULT_SECTIONS.map((section) => {
    if (section.id === "donations" || section.id === "store") {
      return { ...section, enabled: true };
    }
    return section;
  });

  await db.pageDraft.create({
    data: {
      artistId: artist.id,
      templateId: "01",
      themeMode: "dark",
      background: "#101724",
      textColor: "#f4f7fb",
      accent: "#55d5ee",
      heroMediaId: hero?.id ?? null,
      portraitMediaId: portrait?.id ?? null,
      editorOrder: JSON.stringify(DEFAULT_EDITOR_ORDER),
      sections: JSON.stringify(sections),
      version: 1,
    },
  });

  console.log("A criar ligações externas…");
  const links = [
    { platform: "instagram", url: "https://instagram.com/muskalive", group: "social", position: 0 },
    { platform: "muska", url: "https://muskalive.com", group: "social", position: 1 },
    { platform: "youtube", url: "https://www.youtube.com/@muska", group: "social", position: 2 },
    { platform: "tiktok", url: "https://www.tiktok.com/@muska", group: "social", position: 3 },
  ];
  for (const link of links) {
    await db.externalLink.create({ data: { artistId: artist.id, ...link } });
  }

  console.log("A criar eventos de demonstração…");
  const now = new Date();
  const events = [
    { title: "Frequency Room", days: 12, venue: "Kebra Cabana", city: "Praia" },
    { title: "Atlantic Motion", days: 26, venue: "Santa Maria Beach", city: "Sal" },
    { title: "After Hours", days: 41, venue: "Centro Cultural", city: "Mindelo" },
  ];
  for (const event of events) {
    await db.event.create({
      data: {
        artistId: artist.id,
        source: "manual",
        title: event.title,
        startsAt: new Date(now.getTime() + event.days * 24 * 60 * 60 * 1000),
        venue: event.venue,
        city: event.city,
        country: "Cabo Verde",
        description: "Evento de demonstração. Não representa uma data confirmada.",
      },
    });
  }

  console.log("A criar disponibilidade…");
  await db.availability.create({
    data: {
      artistId: artist.id,
      startsAt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      endsAt: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000),
      status: "available",
      privateNote: "Nota privada de demonstração — nunca aparece na página pública.",
    },
  });

  console.log("A criar campanha e produtos de demonstração…");
  await db.campaign.create({
    data: {
      artistId: artist.id,
      title: "Novo álbum · gravação em estúdio",
      description:
        "Apoia a gravação do próximo álbum. Campanha de demonstração: nenhum pagamento é processado nesta fase.",
      goalMinor: 50000000, // 500 000 CVE
      currency: "CVE",
      status: "active",
      isPublic: true,
    },
  });

  const tshirt = await db.product.create({
    data: {
      artistId: artist.id,
      title: "T-shirt KAIRO",
      description: "Algodão orgânico, serigrafia a duas cores. Produto de demonstração.",
      type: "physical",
      currency: "CVE",
      shippingMinor: 50000,
      shippingInfo: "Envio em 3 a 5 dias úteis. Entrega da responsabilidade do artista.",
      isPublished: true,
    },
  });
  await db.productVariant.createMany({
    data: [
      { productId: tshirt.id, name: "S", priceMinor: 250000, stock: 8, position: 0 },
      { productId: tshirt.id, name: "M", priceMinor: 250000, stock: 12, position: 1 },
      { productId: tshirt.id, name: "L", priceMinor: 250000, stock: 5, position: 2 },
    ],
  });

  const pack = await db.product.create({
    data: {
      artistId: artist.id,
      title: "Sample pack · Atlantic Percussion",
      description: "48 samples de percussão gravados na Praia. Produto digital de demonstração.",
      type: "digital",
      currency: "CVE",
      isPublished: true,
    },
  });
  await db.productVariant.create({
    data: { productId: pack.id, name: "Download", priceMinor: 150000, stock: null, position: 0 },
  });

  console.log("\nPronto.");
  console.log("  Entrar em  http://localhost:3000/login");
  console.log("  Email      artista@exemplo.cv");
  console.log("  Password   mypage123");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
