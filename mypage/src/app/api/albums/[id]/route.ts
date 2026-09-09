import { db } from "@/lib/db";
import { requireArtistAccess } from "@/lib/auth";
import { ApiError, handle, ok, readJson } from "@/lib/api";

interface Params {
  params: Promise<{ id: string }>;
}

async function loadOwned(id: string, write: boolean) {
  const album = await db.album.findUnique({ where: { id } });
  if (!album) throw new ApiError("Álbum não encontrado.", 404, "not_found");
  await requireArtistAccess(album.artistId, { write });
  return album;
}

export const PATCH = handle(async (request: Request, { params }: Params) => {
  const { id } = await params;
  await loadOwned(id, true);
  const body = await readJson(request);

  const data: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim().slice(0, 80);
  if (typeof body.category === "string" && body.category.trim()) data.category = body.category.trim().slice(0, 40);
  if (body.isPublic !== undefined) data.isPublic = body.isPublic === true;
  if (body.position !== undefined) data.position = Number(body.position) || 0;

  const album = await db.album.update({ where: { id }, data });
  return ok({ id: album.id, isPublic: album.isPublic, name: album.name });
});

export const DELETE = handle(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  const album = await loadOwned(id, true);

  const mediaCount = await db.media.count({ where: { albumId: id } });
  if (mediaCount > 0) {
    // Files survive their album: onDelete SetNull moves them to the loose
    // library rather than destroying originals the artist may still need.
    await db.media.updateMany({ where: { albumId: id }, data: { albumId: null, isPublic: false } });
  }

  await db.album.delete({ where: { id: album.id } });
  return ok({ deleted: true, detachedMedia: mediaCount });
});
