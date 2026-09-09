import { db } from "@/lib/db";
import { requireArtistAccess } from "@/lib/auth";
import { ApiError, handle, ok, optionalEnum, readJson } from "@/lib/api";
import { remove } from "@/lib/storage";

interface Params {
  params: Promise<{ id: string }>;
}

async function loadOwned(id: string, write: boolean) {
  const media = await db.media.findUnique({ where: { id } });
  if (!media) throw new ApiError("Não encontrado.", 404, "not_found");
  await requireArtistAccess(media.artistId, { write });
  return media;
}

export const PATCH = handle(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const media = await loadOwned(id, true);
  const body = await readJson(request);

  const data: Record<string, unknown> = {};

  if (typeof body.title === "string" && body.title.trim()) {
    data.title = body.title.trim().slice(0, 160);
  }
  if (body.isPublic !== undefined) {
    data.isPublic = body.isPublic === true;
  }
  if (body.placement !== undefined) {
    data.placement = optionalEnum(body, "placement", ["hero", "section", "both"] as const, "section");
  }
  if (body.position !== undefined) {
    data.position = Number(body.position) || 0;
  }
  if (body.albumId !== undefined) {
    if (body.albumId === null || body.albumId === "") {
      data.albumId = null;
    } else {
      const album = await db.album.findFirst({
        where: { id: String(body.albumId), artistId: media.artistId },
        select: { id: true },
      });
      if (!album) throw new ApiError("Álbum não encontrado.", 404, "album_not_found");
      data.albumId = album.id;
    }
  }

  const updated = await db.media.update({ where: { id }, data });
  return ok({ id: updated.id, isPublic: updated.isPublic, albumId: updated.albumId, title: updated.title });
});

export const DELETE = handle(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  const media = await loadOwned(id, true);

  // Detach the draft references first so a deleted image cannot leave a
  // dangling id behind in the page contract.
  await db.pageDraft.updateMany({
    where: { artistId: media.artistId, heroMediaId: id },
    data: { heroMediaId: null },
  });
  await db.pageDraft.updateMany({
    where: { artistId: media.artistId, portraitMediaId: id },
    data: { portraitMediaId: null },
  });
  await db.pageDraft.updateMany({
    where: { artistId: media.artistId, logoMediaId: id },
    data: { logoMediaId: null },
  });

  await db.media.delete({ where: { id } });
  await remove(media.originalKey);
  await remove(media.derivedKey);

  return ok({ deleted: true });
});
