import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * The frontend server (MYPAGE_ROLE=web) has no database: pages read through
 * lib/data, which forwards to the API server. Any query that still reaches
 * here would be a page bypassing that, so it fails loudly instead of trying
 * to connect.
 */
const frontendOnly = new Proxy({} as PrismaClient, {
  get() {
    throw new Error("MYPAGE_ROLE=web não tem base de dados: as páginas leem através de lib/data (load).");
  },
});

export const db =
  process.env.MYPAGE_ROLE === "web"
    ? frontendOnly
    : (globalForPrisma.prisma ??
      new PrismaClient({
        log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
      }));

if (process.env.NODE_ENV !== "production" && process.env.MYPAGE_ROLE !== "web") globalForPrisma.prisma = db;
