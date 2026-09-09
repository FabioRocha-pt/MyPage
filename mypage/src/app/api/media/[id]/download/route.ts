import { db } from "@/lib/db";
import { getAccount } from "@/lib/auth";
import { ApiError, handle } from "@/lib/api";
import { etagFor, exists, readStream } from "@/lib/storage";

/**
 * Authorised download of the ORIGINAL file.
 *
 * Doc 02 requires "download autorizado do original" and doc 03 requires
 * "Originais e downloads pagos privados". The original is therefore stricter
 * than the display derivative: an anonymous visitor may only fetch it when the
 * file sits in a public album AND is itself public. Digital goods bought in the
 * store are released through /api/orders/[reference]/download instead, which
 * additionally requires a verified payment.
 */

interface Params {
  params: Promise<{ id: string }>;
}

export const GET = handle(async (_request: Request, { params }: Params) => {
  const { id } = await params;

  const media = await db.media.findUnique({
    where: { id },
    include: { album: { select: { isPublic: true } } },
  });
  if (!media) throw new ApiError("Não encontrado.", 404, "not_found");
  if (!media.originalKey) throw new ApiError("Este item não tem ficheiro original.", 409, "no_original");

  const publiclyDownloadable = media.isPublic && media.album !== null && media.album.isPublic;

  if (!publiclyDownloadable) {
    const account = await getAccount();
    const allowed = account
      ? await db.membership.findUnique({
          where: { accountId_artistId: { accountId: account.id, artistId: media.artistId } },
          select: { id: true },
        })
      : null;
    if (!allowed) throw new ApiError("Não encontrado.", 404, "not_found");
  }

  if (!(await exists(media.originalKey))) throw new ApiError("Ficheiro indisponível.", 410, "gone");

  return new Response(readStream(media.originalKey), {
    headers: {
      "Content-Type": media.mimeType,
      ETag: etagFor(media.originalKey),
      "Cache-Control": "private, max-age=0, no-store",
      "X-Content-Type-Options": "nosniff",
      // attachment, always: an original is downloaded, never rendered in place.
      "Content-Disposition": `attachment; filename="${encodeURIComponent(media.title)}"`,
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
});
