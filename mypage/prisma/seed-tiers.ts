/**
 * Cria uma conta de teste por plano pago, para validar as diferenças de
 * entitlement (ferramentas, templates, limites) sem mexer na conta de
 * demonstração criada por `seed.ts`.
 *
 * Idempotente: correr outra vez apenas repõe a password e o plano.
 * A password é a mesma para todas as contas — são dados de demonstração,
 * nunca devem existir num ambiente com dados reais.
 *
 *   npm run db:seed:tiers
 */

import { existsSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth";
import { DEFAULT_EDITOR_ORDER, DEFAULT_SECTIONS } from "../src/lib/page-model";
import { getEntitlement } from "../src/lib/entitlements";

const db = new PrismaClient();

const PASSWORD = "mypage123";

/**
 * Diz em que base de dados vamos escrever, antes de escrever.
 *
 * No Plesk o `DATABASE_URL` injetado pelo painel ganha ao do `.env` (o dotenv
 * do Prisma não sobrepõe variáveis já presentes no processo), e um caminho com
 * `<HOME>` não expandido faz o SQLite criar um ficheiro novo e vazio em vez de
 * abrir o real — as contas seriam criadas num sítio que a app nunca lê.
 * Abortamos nesse caso em vez de deixar duas bases de dados a existir.
 */
function assertTargetDatabase(): void {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL não está definido.");
  }

  if (!url.startsWith("file:")) {
    // Postgres/MySQL: não imprimir a password.
    console.log(`Base de dados: ${url.replace(/\/\/[^@]*@/, "//***@")}\n`);
    return;
  }

  if (url.includes("<") || url.includes("$")) {
    throw new Error(
      `DATABASE_URL contém um placeholder não expandido: ${url}\n` +
        "No painel do Plesk substitui por um caminho absoluto, " +
        'por exemplo "file:/var/www/vhosts/<dominio>/private/mypage.db".',
    );
  }

  // O Prisma resolve caminhos SQLite relativos a partir da pasta do schema.
  const file = url.slice("file:".length);
  const resolved = path.isAbsolute(file) ? file : path.resolve(import.meta.dirname, file);
  const exists = existsSync(resolved);

  console.log(`Base de dados: ${resolved}`);
  console.log(exists ? "  (ficheiro existente — vamos atualizar)\n" : "  (NÃO EXISTE — seria criado vazio)\n");

  if (!exists) {
    throw new Error(
      "A base de dados não existe neste caminho. Confirma o DATABASE_URL antes de semear, " +
        "senão as contas vão para um ficheiro que a aplicação não usa.",
    );
  }
}

/**
 * As secções pagas ficam desligadas por defeito (doc 02). Ligamo-las aqui
 * quando o plano as inclui, para que a página de teste mostre logo aquilo
 * que distingue o tier.
 */
const ACCOUNTS = [
  {
    plan: "free",
    email: "free@exemplo.cv",
    displayName: "Teste Free",
    slug: "teste-free",
    tagline: "Conta de teste · plano Free",
    templateId: "01",
    enable: [] as string[],
  },
  {
    plan: "pro",
    email: "pro@exemplo.cv",
    displayName: "Teste Pro",
    slug: "teste-pro",
    tagline: "Conta de teste · plano Pro (25 €)",
    templateId: "03",
    enable: ["donations"],
  },
  {
    plan: "premium",
    email: "premium@exemplo.cv",
    displayName: "Teste Premium",
    slug: "teste-premium",
    tagline: "Conta de teste · plano Premium (50 €)",
    templateId: "05",
    enable: ["donations", "store"],
  },
];

async function main() {
  assertTargetDatabase();

  for (const spec of ACCOUNTS) {
    const entitlement = await getEntitlement(spec.plan);
    if (entitlement.plan !== spec.plan) {
      console.warn(`! Plano "${spec.plan}" não existe em PlanEntitlement — corre primeiro "npm run db:seed".`);
      continue;
    }

    const account = await db.account.upsert({
      where: { email: spec.email },
      update: { passwordHash: hashPassword(PASSWORD), displayName: spec.displayName },
      create: {
        email: spec.email,
        passwordHash: hashPassword(PASSWORD),
        displayName: spec.displayName,
      },
    });

    const artist = await db.artist.upsert({
      where: { slug: spec.slug },
      update: { plan: spec.plan, displayName: spec.displayName, tagline: spec.tagline },
      create: {
        slug: spec.slug,
        displayName: spec.displayName,
        tagline: spec.tagline,
        city: "Praia",
        country: "Cabo Verde",
        contactEmail: spec.email,
        plan: spec.plan,
      },
    });

    await db.membership.upsert({
      where: { accountId_artistId: { accountId: account.id, artistId: artist.id } },
      update: { role: "owner" },
      create: { accountId: account.id, artistId: artist.id, role: "owner" },
    });

    // O template só é aplicado se o plano o permitir — a mesma regra que o
    // servidor aplica em `assertTemplate`.
    const templateId = entitlement.allowedTemplates.includes(spec.templateId)
      ? spec.templateId
      : entitlement.allowedTemplates[0] ?? "01";

    const sections = DEFAULT_SECTIONS.map((section) =>
      spec.enable.includes(section.id) ? { ...section, enabled: true } : section,
    );

    await db.pageDraft.upsert({
      where: { artistId: artist.id },
      update: { templateId, sections: JSON.stringify(sections) },
      create: {
        artistId: artist.id,
        templateId,
        editorOrder: JSON.stringify(DEFAULT_EDITOR_ORDER),
        sections: JSON.stringify(sections),
      },
    });

    const price = (entitlement.priceMinor / 100).toFixed(2);
    console.log(
      `${entitlement.label.padEnd(8)} ${spec.email.padEnd(20)} ${PASSWORD.padEnd(11)} ` +
        `/${artist.slug}  template ${templateId}  ${price} ${entitlement.currency}/mês`,
    );
    console.log(`         ferramentas: ${entitlement.tools.join(", ")}`);
    console.log(
      `         limites: ${entitlement.maxMediaItems} ficheiros · ${entitlement.maxStorageMb} MB · ` +
        `${entitlement.maxEvents} eventos · ${entitlement.maxProducts} produtos · ` +
        `templates ${entitlement.allowedTemplates.join("/")} · ` +
        `domínio próprio ${entitlement.customDomain ? "sim" : "não"} · ` +
        `sem marca ${entitlement.removeBranding ? "sim" : "não"}`,
    );
  }

  console.log("\nEntrar em /login com qualquer um dos emails acima.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
