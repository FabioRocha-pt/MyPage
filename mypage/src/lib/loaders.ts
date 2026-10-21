import { getAccount, getCurrentArtistId } from "./auth";
import { db } from "./db";
import { getArtistEntitlement, getEntitlement } from "./entitlements";
import { loadLibrary } from "./library";
import { getMuskaAdapter } from "./muska";
import { loadPublishedSnapshot } from "./published";
import { buildSnapshot } from "./snapshot";
import { landingFor, requireStaffAccount, requireStudioContext } from "./studio";

/**
 * Every database read a page makes, in one place.
 *
 * Pages never touch Prisma themselves: they call these through `load` (lib/data),
 * which runs them in-process when the app owns the database, or asks the API
 * server for them when this process is only the frontend (MYPAGE_ROLE=web, see
 * DEPLOY.md). Each loader resolves the session itself from the request cookie,
 * so calling one over HTTP grants nothing the same page would not show.
 *
 * The bodies are the pages' former queries, moved here unchanged.
 */
export const loaders = {
  // --- Public ----------------------------------------------------------------

  publishedSnapshot: (slug: string) => loadPublishedSnapshot(slug),

  publishedPages: () =>
    db.publishedPage.findMany({
      where: { isLive: true },
      orderBy: { publishedAt: "desc" },
      take: 48,
      select: { slug: true, snapshot: true },
    }),

  // --- Sign-in and catalogue -------------------------------------------------

  /** The session, if any, and where it belongs (/login, /signup) or null. */
  signedInLanding: async () => {
    const account = await getAccount();
    const landing = account ? await landingFor(account) : null;
    return { account, landing };
  },

  freeEntitlement: () => getEntitlement("free"),

  templateChoice: async () => {
    const account = await getAccount();
    const artistId = account ? await getCurrentArtistId(account.id) : null;

    const [draft, entitlement] = await Promise.all([
      artistId ? db.pageDraft.findUnique({ where: { artistId }, select: { templateId: true, version: true } }) : null,
      artistId ? getArtistEntitlement(artistId) : null,
    ]);
    return { artistId, draft, entitlement };
  },

  // --- Admin -----------------------------------------------------------------

  staffAccount: () => requireStaffAccount(),

  adminOverview: async () => {
    // The admin layout already gates the screen; repeated here because a loader
    // can be reached without going through that layout.
    await requireStaffAccount();
    return Promise.all([
      db.toolRequest.findMany({
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        take: 100,
        include: {
          account: { select: { email: true } },
          artist: { select: { displayName: true } },
        },
      }),
      db.artist.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true,
          slug: true,
          displayName: true,
          plan: true,
          createdAt: true,
          publishedPages: { where: { isLive: true }, select: { version: true, publishedAt: true } },
        },
      }),
      db.account.count(),
      db.artist.count(),
      db.publishedPage.count({ where: { isLive: true } }),
      db.toolRequest.count({ where: { status: "new" } }),
    ]);
  },

  // --- Studio ----------------------------------------------------------------

  studioContext: () => requireStudioContext(),

  studioDashboard: async () => {
    const context = await requireStudioContext();
    const { artist } = context;
    const rows = await Promise.all([
      db.bookingRequest.count({ where: { artistId: artist.id, status: "new" } }),
      db.bookingRequest.count({ where: { artistId: artist.id } }),
      db.donation.aggregate({
        where: { status: "confirmed", campaign: { artistId: artist.id } },
        _sum: { amountMinor: true },
        _count: true,
      }),
      db.notification.findMany({
        where: { artistId: artist.id },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
      db.pageDraft.findUnique({
        where: { artistId: artist.id },
        select: { heroMediaId: true, portraitMediaId: true, templateId: true },
      }),
      db.externalLink.count({ where: { artistId: artist.id } }),
    ]);
    return { context, rows };
  },

  studioEditor: async () => {
    const context = await requireStudioContext();
    const { account, artist } = context;
    const rows = await Promise.all([
      db.artist.findUniqueOrThrow({ where: { id: artist.id } }),
      db.media.findMany({
        where: { artistId: artist.id, kind: "image", status: "ready" },
        orderBy: [{ position: "asc" }, { createdAt: "desc" }],
        select: { id: true, title: true },
        take: 200,
      }),
      db.externalLink.findMany({
        where: { artistId: artist.id },
        orderBy: [{ group: "asc" }, { position: "asc" }],
      }),
      db.publishedPage.findFirst({
        where: { artistId: artist.id, isLive: true },
        select: { version: true },
      }),
      db.pressLink.findMany({ where: { artistId: artist.id } }),
      db.album.findMany({
        where: { artistId: artist.id },
        orderBy: { position: "asc" },
        include: { _count: { select: { media: true } } },
      }),
      db.media.findMany({
        where: { artistId: artist.id, kind: "audio", status: "ready" },
        orderBy: [{ position: "asc" }, { createdAt: "desc" }],
        take: 200,
      }),
      db.media.findMany({
        where: { artistId: artist.id, kind: "video", status: "ready" },
        orderBy: [{ position: "asc" }, { createdAt: "desc" }],
        take: 200,
      }),
      db.event.findMany({
        where: { artistId: artist.id, isArchived: false },
        orderBy: { startsAt: "asc" },
        take: 200,
      }),
      db.toolRequest.findMany({ where: { accountId: account.id }, orderBy: { createdAt: "desc" }, take: 20 }),
      db.media.findMany({
        where: { artistId: artist.id },
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true },
        take: 20,
      }),
    ]);

    const record =
      (await db.pageDraft.findUnique({ where: { artistId: artist.id } })) ??
      (await db.pageDraft.create({ data: { artistId: artist.id, editorOrder: "[]", sections: "[]" } }));

    return { context, rows, record };
  },

  studioPreview: async () => {
    const context = await requireStudioContext();
    const build = await buildSnapshot(context.artist.id, { mode: "preview" });
    return { context, build };
  },

  studioLibrary: async (kind: "audio" | "video") => {
    const context = await requireStudioContext();
    const items = await loadLibrary(context.artist.id, kind);
    // Read where the Muska credentials live (the API server), not in the frontend.
    const muska = getMuskaAdapter().status();
    return { context, items, muska };
  },

  studioEvents: async () => {
    const context = await requireStudioContext();
    const { artist } = context;
    const rows = await Promise.all([
      db.event.findMany({
        where: { artistId: artist.id, isArchived: false },
        orderBy: { startsAt: "asc" },
        take: 100,
      }),
      db.media.findMany({
        where: { artistId: artist.id, kind: "image", status: "ready" },
        select: { id: true, title: true },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
    ]);
    // Read where the Muska credentials live (the API server), not in the frontend.
    const muskaConnected = getMuskaAdapter().status().connected;
    return { context, rows, muskaConnected };
  },

  studioBooking: async () => {
    const context = await requireStudioContext();
    const { artist } = context;
    const rows = await Promise.all([
      db.availability.findMany({ where: { artistId: artist.id }, orderBy: { startsAt: "asc" }, take: 500 }),
      db.event.findMany({
        where: { artistId: artist.id, isArchived: false },
        orderBy: { startsAt: "asc" },
        select: { id: true, title: true, startsAt: true },
        take: 500,
      }),
      db.bookingRequest.findMany({ where: { artistId: artist.id }, orderBy: { createdAt: "desc" }, take: 50 }),
    ]);
    return { context, rows };
  },

  studioDonations: async () => {
    const context = await requireStudioContext();
    const campaigns = await db.campaign.findMany({
      where: { artistId: context.artist.id },
      orderBy: { createdAt: "desc" },
      include: { donations: { select: { amountMinor: true, status: true } } },
    });
    return { context, campaigns };
  },

  studioStore: async () => {
    const context = await requireStudioContext();
    const { artist } = context;
    const rows = await Promise.all([
      db.product.findMany({
        where: { artistId: artist.id },
        orderBy: { createdAt: "desc" },
        include: { variants: { orderBy: { position: "asc" } } },
      }),
      db.order.findMany({
        where: { artistId: artist.id },
        orderBy: { createdAt: "desc" },
        take: 40,
        include: { items: true, payment: { select: { status: true } } },
      }),
      // Doc 04: a digital product must be private before it can be sold.
      db.media.findMany({
        where: { artistId: artist.id, isPublic: false, NOT: { originalKey: null } },
        select: { id: true, title: true },
        take: 200,
      }),
      db.media.findMany({
        where: { artistId: artist.id, kind: "image", status: "ready" },
        select: { id: true, title: true },
        take: 200,
      }),
    ]);
    return { context, rows };
  },
};

export type Loaders = typeof loaders;
export type LoaderName = keyof Loaders;
