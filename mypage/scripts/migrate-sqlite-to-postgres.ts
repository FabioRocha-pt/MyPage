/**
 * Copia uma base de dados SQLite antiga do My Page para o PostgreSQL.
 *
 * Até outubro de 2026 a app corria em SQLite (staging incluído). O schema não
 * mudou na passagem, só o provider, por isso a cópia é tabela a tabela, pela
 * ordem das chaves estrangeiras, com os mesmos ids: as páginas publicadas, as
 * referências a media no conteúdo e as sessões continuam válidas.
 *
 *   SQLITE_URL="file:/caminho/mypage.db" npm run db:migrate-from-sqlite
 *
 * O destino é o `DATABASE_URL` (PostgreSQL), com o schema já criado
 * (`npm run db:push`). Tem de estar vazio; `--replace` apaga primeiro o que lá
 * estiver. Os ficheiros (STORAGE_DIR) não passam por aqui: copiam-se à parte,
 * as chaves na base de dados são caminhos relativos e não mudam.
 *
 * Como funciona: gera um segundo cliente Prisma, igual ao da app mas com o
 * provider sqlite, em node_modules/.prisma/sqlite-client, e lê com ele.
 */

import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { Prisma, PrismaClient } from "@prisma/client";

const ROOT = path.resolve(import.meta.dirname, "..");
const BATCH = 500;

const sqliteUrl = process.env.SQLITE_URL;
const targetUrl = process.env.DATABASE_URL ?? "";
const replace = process.argv.includes("--replace");

if (!sqliteUrl?.startsWith("file:")) {
  console.error('Uso: SQLITE_URL="file:/caminho/mypage.db" npm run db:migrate-from-sqlite [-- --replace]');
  process.exit(1);
}
if (!/^postgres(ql)?:\/\//.test(targetUrl)) {
  console.error("DATABASE_URL tem de apontar para o PostgreSQL de destino.");
  process.exit(1);
}

/** The app's schema with the sqlite provider and its own client output. */
function sqliteClient(): PrismaClient {
  const dir = path.join(ROOT, "prisma", ".sqlite");
  mkdirSync(dir, { recursive: true });
  const schema = readFileSync(path.join(ROOT, "prisma", "schema.prisma"), "utf8")
    .replace(/provider\s*=\s*"postgresql"/, 'provider = "sqlite"')
    .replace(/url\s*=\s*env\("DATABASE_URL"\)/, 'url = env("SQLITE_URL")')
    .replace(/output\s*=\s*"[^"]*"/, 'output = "../../node_modules/.prisma/sqlite-client"');
  const file = path.join(dir, "schema.prisma");
  writeFileSync(file, schema);
  execSync(`npx prisma generate --schema "${file}"`, { cwd: ROOT, stdio: "ignore" });
  const require = createRequire(import.meta.url);
  const { PrismaClient: SqliteClient } = require(path.join(ROOT, "node_modules", ".prisma", "sqlite-client"));
  return new SqliteClient() as PrismaClient;
}

/** Models ordered so that every foreign key points at a table already copied. */
function copyOrder(): string[] {
  const models = Prisma.dmmf.datamodel.models;
  const deps = new Map(
    models.map((model) => [
      model.name,
      model.fields
        .filter((field) => field.kind === "object" && (field.relationFromFields?.length ?? 0) > 0)
        .map((field) => field.type)
        .filter((type) => type !== model.name),
    ]),
  );
  const order: string[] = [];
  const visit = (name: string, trail: string[] = []) => {
    if (order.includes(name)) return;
    if (trail.includes(name)) throw new Error(`Ciclo de chaves estrangeiras: ${[...trail, name].join(" → ")}`);
    for (const dep of deps.get(name) ?? []) visit(dep, [...trail, name]);
    order.push(name);
  };
  for (const model of models) visit(model.name);
  return order;
}

type Delegate = {
  count: () => Promise<number>;
  findMany: (args: { skip: number; take: number; orderBy?: Record<string, "asc"> }) => Promise<Record<string, unknown>[]>;
  createMany: (args: { data: Record<string, unknown>[] }) => Promise<{ count: number }>;
  deleteMany: () => Promise<unknown>;
};
const delegate = (client: PrismaClient, model: string) =>
  (client as unknown as Record<string, Delegate>)[model[0].toLowerCase() + model.slice(1)];

async function main() {
  const order = copyOrder();
  const source = sqliteClient();
  const target = new PrismaClient();

  console.log(`Origem:  ${sqliteUrl}`);
  console.log(`Destino: ${targetUrl.replace(/\/\/[^@]*@/, "//***@")}\n`);

  const existing = (await Promise.all(order.map((model) => delegate(target, model).count()))).reduce((a, b) => a + b, 0);
  if (existing > 0) {
    if (!replace) throw new Error(`O destino já tem ${existing} registos. Usa --replace para os apagar antes de copiar.`);
    for (const model of [...order].reverse()) await delegate(target, model).deleteMany();
    console.log(`  · destino limpo (${existing} registos apagados)\n`);
  }

  const ids = new Map(Prisma.dmmf.datamodel.models.map((m) => [m.name, m.fields.find((f) => f.isId)?.name]));
  for (const model of order) {
    const from = delegate(source, model);
    const to = delegate(target, model);
    const total = await from.count();
    const idField = ids.get(model);
    for (let skip = 0; skip < total; skip += BATCH) {
      const rows = await from.findMany({ skip, take: BATCH, ...(idField ? { orderBy: { [idField]: "asc" } } : {}) });
      await to.createMany({ data: rows });
    }
    const copied = await to.count();
    if (copied !== total) throw new Error(`${model}: ${total} na origem, ${copied} no destino.`);
    console.log(`  ${model.padEnd(20)} ${total}`);
  }

  await source.$disconnect();
  await target.$disconnect();
  console.log("\nCópia concluída. Falta copiar a pasta STORAGE_DIR, se o servidor mudou.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
