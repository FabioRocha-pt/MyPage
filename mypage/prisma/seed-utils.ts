import { existsSync } from "node:fs";
import path from "node:path";

/**
 * Diz em que base de dados vamos escrever, antes de escrever.
 *
 * No Plesk o `DATABASE_URL` injetado pelo painel ganha ao do `.env` (o dotenv
 * do Prisma não sobrepõe variáveis já presentes no processo), e um caminho com
 * `<HOME>` não expandido faz o SQLite criar um ficheiro novo e vazio em vez de
 * abrir o real — as contas seriam criadas num sítio que a app nunca lê.
 * Abortamos nesse caso em vez de deixar duas bases de dados a existir.
 */
export function assertTargetDatabase(): void {
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

