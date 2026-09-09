import { db } from "@/lib/db";
import { getAccount } from "@/lib/auth";
import { ApiError, fail, handle } from "@/lib/api";
import { etagFor, exists, readStream } from "@/lib/storage";

/**
 * Serves the display derivative (or the original when no derivative exists).
 *
 * Access rule, from doc 02: "ficheiro privado não pode ser acessível
 * publicamente por URL previsível." A media item is readable when:
 *   - it is marked public and its album (if any) is public; or
 *   - the caller manages the owning artist.
 *
 * A denied read returns 404, not 403, so the endpoint does not confirm that an
 * id exists.
 */

interface Params {
  params: Promise<{ id: string }>;
}

export const GET = handle(async (request: Request, { params }: Params) => {
  const { id } = await params;

  const media = await db.media.findUnique({
    where: { id },
    include: { album: { select: { isPublic: true } } },
  });
  if (!media) throw new ApiError("Não encontrado.", 404, "not_found");

  const publiclyVisible = media.isPublic && (media.album === null || media.album.isPublic);

  if (!publiclyVisible) {
    const account = await getAccount();
    const allowed = account
      ? await db.membership.findUnique({
          where: { accountId_artistId: { accountId: account.id, artistId: media.artistId } },
          select: { id: true },
        })
      : null;
    if (!allowed) throw new ApiError("Não encontrado.", 404, "not_found");
  }

  const key = media.derivedKey ?? media.originalKey;
  if (!key) {
    // External links have no stored bytes; the caller should use externalUrl.
    return fail("Este item é uma ligação externa.", 409, "external_only");
  }
  if (!(await exists(key))) throw new ApiError("Ficheiro indisponível.", 410, "gone");

  const etag = etagFor(key);
  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag } });
  }

  const isDerived = key === media.derivedKey;
  const contentType = isDerived ? "image/webp" : media.mimeType;

  return new Response(readStream(key), {
    headers: {
      "Content-Type": contentType,
      ETag: etag,
      // Keys are content-addressed by randomness and never rewritten, so a
      // public derivative can be cached hard. Private items must not be cached
      // by shared caches.
      "Cache-Control": publiclyVisible
        ? "public, max-age=31536000, immutable"
        : "private, max-age=0, no-store",
      // Belt and braces: even if an allowed type were somehow scriptable, the
      // browser must not sniff or render it as a document.
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": `inline; filename="${encodeURIComponent(media.title)}"`,
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
});
