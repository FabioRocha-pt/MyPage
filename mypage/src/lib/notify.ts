import { db } from "./db";

/**
 * Notification outbox.
 *
 * Doc 04, etapa 5 acceptance criterion: "notificações não duplicam."
 *
 * Every notification goes through `notify`, which is idempotent on
 * `dedupeKey`. A retried webhook, a double-submitted form or a re-run sync all
 * converge on the same row, so the artist is told once.
 *
 * No email provider was specified in the handoff, so delivery is in-app only.
 * Adding email means implementing `deliver` — the dedupe guarantee is already
 * in place and does not need to be reimplemented per channel.
 */

export interface NotifyInput {
  artistId?: string | null;
  dedupeKey: string;
  type: string;
  title: string;
  body: string;
  href?: string | null;
}

export async function notify(input: NotifyInput): Promise<boolean> {
  try {
    await db.notification.create({
      data: {
        artistId: input.artistId ?? null,
        dedupeKey: input.dedupeKey,
        type: input.type,
        title: input.title,
        body: input.body.slice(0, 2000),
        href: input.href ?? null,
        channel: "inapp",
        sentAt: new Date(),
      },
    });
    return true;
  } catch (error) {
    // P2002 = unique constraint on dedupeKey: already notified.
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return false;
    }
    throw error;
  }
}

export async function listNotifications(artistId: string, limit = 20) {
  return db.notification.findMany({
    where: { artistId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function markRead(artistId: string, ids: string[]): Promise<number> {
  const result = await db.notification.updateMany({
    where: { artistId, id: { in: ids }, readAt: null },
    data: { readAt: new Date() },
  });
  return result.count;
}
