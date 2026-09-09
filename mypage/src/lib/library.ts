import { db } from "./db";
import type { MediaRow } from "@/components/studio/MediaLibrary";

/**
 * Server-side loader for the media library screens.
 *
 * Returns exactly the shape GET /api/artists/{id}/media returns, so the first
 * render and every later refresh in the browser agree — the client component
 * does not need two mappings for the same rows.
 */
export async function loadLibrary(artistId: string, kind: "audio" | "video" | "image"): Promise<MediaRow[]> {
  const items = await db.media.findMany({
    where: { artistId, kind },
    orderBy: [{ position: "asc" }, { createdAt: "desc" }],
    take: 200,
  });

  return items.map((item) => ({
    id: item.id,
    title: item.title,
    kind: item.kind,
    mimeType: item.mimeType,
    sizeBytes: item.sizeBytes,
    derivedBytes: item.derivedBytes,
    isPublic: item.isPublic,
    platform: item.platform,
    externalUrl: item.externalUrl,
    hasOriginal: Boolean(item.originalKey),
    viewUrl: `/api/media/${item.id}/view`,
    downloadUrl: item.originalKey ? `/api/media/${item.id}/download` : null,
    createdAt: item.createdAt.toISOString(),
  }));
}
