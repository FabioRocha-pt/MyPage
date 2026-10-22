/**
 * Addresses of the public service and sector pages, in the order the landing
 * handoff lists them (it named the files servico-<key>.html and
 * setor-<key>.html). Shared by the server routes and the client components,
 * so it lives outside any "use client" module.
 */

export const SERVICE_KEYS = [
  "presence",
  "media",
  "presskit",
  "booking",
  "events",
  "smartlink",
  "donations",
  "store",
  "learning",
  "live",
] as const;
export const SECTOR_KEYS = ["djs-produtores", "labels-clubs", "artistas-musicos", "servicos-musicais"] as const;

export const serviceHref = (key: string) => `/servicos/${key}`;
export const sectorHref = (key: string) => `/setores/${key}`;
