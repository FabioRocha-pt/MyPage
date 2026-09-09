import { redirect } from "next/navigation";
import { db } from "./db";
import { getAccount, listManagedArtists, type Role, type SessionAccount } from "./auth";
import { getArtistEntitlement, getUsage, type Entitlement, type UsageSnapshot } from "./entitlements";

/**
 * The context every backoffice screen needs.
 *
 * Page components must not each re-derive "who is signed in and which artist am
 * I editing": they call this, and the artist-scoped API routes re-check the
 * membership anyway (lib/auth `requireArtistAccess`), so a stale or forged id
 * never reaches the data layer.
 */

export interface StudioArtist {
  id: string;
  slug: string;
  displayName: string;
  plan: string;
  muskaId: string | null;
  role: Role;
}

export interface StudioContext {
  account: SessionAccount;
  artist: StudioArtist;
  artists: StudioArtist[];
  entitlement: Entitlement;
  usage: UsageSnapshot;
  /** True once the artist has a live published page. */
  isPublished: boolean;
  /** Timestamp of the live version, if any. */
  publishedAt: Date | null;
  /** Last draft save, used by the editor's "guardado às…" line. */
  draftUpdatedAt: Date | null;
}

export async function requireStudioContext(): Promise<StudioContext> {
  const account = await getAccount();
  if (!account) redirect("/login?next=/studio");

  const artists = await listManagedArtists(account.id);
  const artist = artists[0];
  // An account always gets an artist at registration; this only happens if a
  // membership was removed behind its back.
  if (!artist) redirect("/signup");

  const [entitlement, usage, published, draft] = await Promise.all([
    getArtistEntitlement(artist.id),
    getUsage(artist.id),
    db.publishedPage.findFirst({
      where: { artistId: artist.id, isLive: true },
      select: { publishedAt: true },
    }),
    db.pageDraft.findUnique({
      where: { artistId: artist.id },
      select: { updatedAt: true },
    }),
  ]);

  return {
    account,
    artist,
    artists,
    entitlement,
    usage,
    isPublished: Boolean(published),
    publishedAt: published?.publishedAt ?? null,
    draftUpdatedAt: draft?.updatedAt ?? null,
  };
}

/** Human labels for the tool keys used by PlanEntitlement.tools. */
export const TOOL_LABELS: Record<string, string> = {
  basic: "Informações básicas",
  visual: "Imagens e cores",
  press: "Press kit",
  music: "Música e sets",
  video: "Vídeos",
  events: "Eventos",
  booking: "Booking",
  donations: "Donativos",
  store: "Merchandising",
};

export function formatDateTime(value: Date | string | null): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
