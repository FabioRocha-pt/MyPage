import { redirect } from "next/navigation";
import { db } from "./db";
import { getAccount, getCurrentArtistId, listManagedArtists, type Role, type SessionAccount } from "./auth";
import { getArtistEntitlement, getUsage, type Entitlement, type UsageSnapshot } from "./entitlements";

/**
 * The gate for the admin area.
 *
 * `requireStaff` in lib/auth throws, which is right for a route handler and
 * wrong for a screen. This is the page-level twin: it redirects instead, and it
 * deliberately does not call `requireStudioContext`, which would bounce a staff
 * account that manages no artist of its own straight to /signup.
 */
export async function requireStaffAccount(): Promise<SessionAccount> {
  const account = await getAccount();
  if (!account) redirect("/login?next=/admin");
  if (account.platformRole !== "staff") redirect("/studio");
  return account;
}

/**
 * Where a signed-in account belongs, or null if it should stay where it is.
 *
 * /login and /signup each bounce an existing session to /studio, while
 * `requireStudioContext` bounces an account with no artist to /signup. Those
 * two rules close a cycle: a session without a membership ping-pongs between
 * the two routes forever. Routing every "you are already signed in" decision
 * through this function makes that impossible, because it only ever returns a
 * destination the account can actually render — and null instead of a guess.
 *
 * Staff legitimately have no artist (see `requireArtistAccess` in lib/auth), so
 * they are not an anomaly to be sent through registration.
 */
export async function landingFor(account: SessionAccount): Promise<string | null> {
  if (account.platformRole === "staff") return "/admin";
  const artistId = await getCurrentArtistId(account.id);
  return artistId ? "/studio" : null;
}

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
  if (!artist) {
    // A team account holds no membership by design, so it must not be pushed
    // through registration. This is the one redirect that catches every way
    // into the backoffice — /login's default target, a direct /studio visit and
    // the "Dashboard" workspace tab all land here.
    if (account.platformRole === "staff") redirect("/admin");
    // Otherwise: an account always gets an artist at registration, so this only
    // happens if a membership was removed behind its back.
    redirect("/signup");
  }

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
