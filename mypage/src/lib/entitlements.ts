import { db } from "./db";

/**
 * Plan entitlements, enforced on the server.
 *
 * Doc 03: "PlanEntitlement | Plano, limites e ferramentas autorizadas,
 * aplicados no servidor."
 * Doc 02: "A ativação final deve depender da disponibilidade real e dos
 * direitos do plano, não apenas de uma checkbox."
 *
 * The numbers below are the prototype's placeholders. Doc 01 is unambiguous
 * that they are NOT approved: "Os limites exatos, acesso por ferramenta,
 * armazenamento, comissões e regras de downgrade não foram aprovados em
 * detalhe." They live in the database precisely so the owner can change them
 * without a deploy — nothing in the UI hardcodes a limit.
 */

export const PLAN_SEED = [
  {
    plan: "free",
    label: "Free",
    priceMinor: 0,
    currency: "EUR",
    tools: ["basic", "visual", "music", "video", "events", "booking"],
    maxMediaItems: 20,
    maxStorageMb: 200,
    maxEvents: 5,
    maxProducts: 0,
    allowedTemplates: ["01"],
    customDomain: false,
    removeBranding: false,
  },
  {
    plan: "pro",
    label: "Pro",
    priceMinor: 2500,
    currency: "EUR",
    tools: ["basic", "visual", "press", "music", "video", "events", "booking", "donations"],
    maxMediaItems: 200,
    maxStorageMb: 5000,
    maxEvents: 60,
    maxProducts: 0,
    allowedTemplates: ["01", "02", "03"],
    customDomain: false,
    removeBranding: true,
  },
  {
    plan: "premium",
    label: "Premium",
    priceMinor: 5000,
    currency: "EUR",
    tools: ["basic", "visual", "press", "music", "video", "events", "booking", "donations", "store"],
    maxMediaItems: 2000,
    maxStorageMb: 50000,
    maxEvents: 500,
    maxProducts: 200,
    allowedTemplates: ["01", "02", "03", "04", "05"],
    customDomain: true,
    removeBranding: true,
  },
] as const;

export interface Entitlement {
  plan: string;
  label: string;
  priceMinor: number;
  currency: string;
  tools: string[];
  maxMediaItems: number;
  maxStorageMb: number;
  maxEvents: number;
  maxProducts: number;
  allowedTemplates: string[];
  customDomain: boolean;
  removeBranding: boolean;
}

const FALLBACK: Entitlement = {
  ...PLAN_SEED[0],
  tools: [...PLAN_SEED[0].tools],
  allowedTemplates: [...PLAN_SEED[0].allowedTemplates],
};

export async function getEntitlement(plan: string): Promise<Entitlement> {
  const row = await db.planEntitlement.findUnique({ where: { plan } });
  if (!row) return FALLBACK;
  return {
    plan: row.plan,
    label: row.label,
    priceMinor: row.priceMinor,
    currency: row.currency,
    tools: safeParse(row.tools, FALLBACK.tools),
    maxMediaItems: row.maxMediaItems,
    maxStorageMb: row.maxStorageMb,
    maxEvents: row.maxEvents,
    maxProducts: row.maxProducts,
    allowedTemplates: safeParse(row.allowedTemplates, FALLBACK.allowedTemplates),
    customDomain: row.customDomain,
    removeBranding: row.removeBranding,
  };
}

export async function getArtistEntitlement(artistId: string): Promise<Entitlement> {
  const artist = await db.artist.findUnique({ where: { id: artistId }, select: { plan: true } });
  return getEntitlement(artist?.plan ?? "free");
}

function safeParse<T>(value: string, fallback: T): T {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T) : fallback;
  } catch {
    return fallback;
  }
}

export class EntitlementError extends Error {
  constructor(
    message: string,
    readonly tool?: string,
  ) {
    super(message);
    this.name = "EntitlementError";
  }
}

export function assertTool(entitlement: Entitlement, tool: string): void {
  if (!entitlement.tools.includes(tool)) {
    throw new EntitlementError(
      `A ferramenta "${tool}" não está incluída no plano ${entitlement.label}.`,
      tool,
    );
  }
}

export function assertTemplate(entitlement: Entitlement, templateId: string): void {
  if (!entitlement.allowedTemplates.includes(templateId)) {
    throw new EntitlementError(
      `O template ${templateId} não está disponível no plano ${entitlement.label}.`,
    );
  }
}

export interface UsageSnapshot {
  mediaItems: number;
  storageMb: number;
  events: number;
  products: number;
}

export async function getUsage(artistId: string): Promise<UsageSnapshot> {
  const [mediaAgg, mediaCount, events, products] = await Promise.all([
    db.media.aggregate({ where: { artistId }, _sum: { sizeBytes: true, derivedBytes: true } }),
    db.media.count({ where: { artistId } }),
    db.event.count({ where: { artistId, isArchived: false } }),
    db.product.count({ where: { artistId } }),
  ]);
  const bytes = (mediaAgg._sum.sizeBytes ?? 0) + (mediaAgg._sum.derivedBytes ?? 0);
  return {
    mediaItems: mediaCount,
    storageMb: Math.round((bytes / (1024 * 1024)) * 10) / 10,
    events,
    products,
  };
}

export async function assertMediaQuota(artistId: string, incomingBytes: number): Promise<void> {
  const [entitlement, usage] = await Promise.all([
    getArtistEntitlement(artistId),
    getUsage(artistId),
  ]);
  if (usage.mediaItems >= entitlement.maxMediaItems) {
    throw new EntitlementError(
      `Limite de ${entitlement.maxMediaItems} ficheiros atingido no plano ${entitlement.label}.`,
    );
  }
  const incomingMb = incomingBytes / (1024 * 1024);
  if (usage.storageMb + incomingMb > entitlement.maxStorageMb) {
    throw new EntitlementError(
      `Espaço insuficiente: ${entitlement.maxStorageMb} MB no plano ${entitlement.label}.`,
    );
  }
}

export async function assertEventQuota(artistId: string): Promise<void> {
  const [entitlement, usage] = await Promise.all([
    getArtistEntitlement(artistId),
    getUsage(artistId),
  ]);
  if (usage.events >= entitlement.maxEvents) {
    throw new EntitlementError(
      `Limite de ${entitlement.maxEvents} eventos atingido no plano ${entitlement.label}.`,
    );
  }
}

export async function assertProductQuota(artistId: string): Promise<void> {
  const [entitlement, usage] = await Promise.all([
    getArtistEntitlement(artistId),
    getUsage(artistId),
  ]);
  assertTool(entitlement, "store");
  if (usage.products >= entitlement.maxProducts) {
    throw new EntitlementError(
      `Limite de ${entitlement.maxProducts} produtos atingido no plano ${entitlement.label}.`,
    );
  }
}
