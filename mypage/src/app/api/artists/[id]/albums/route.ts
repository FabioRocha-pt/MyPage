import { db } from "@/lib/db";
import { requireArtistAccess } from "@/lib/auth";
import { ApiError, handle, ok, readJson, requireBool, requireString } from "@/lib/api";
import { isValidCategory } from "@/lib/press";

interface Params {
  params: Promise<{ id: string }>;
}

export const GET = handle(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  await requireArtistAccess(id);

  const albums = await db.album.findMany({
    where: { artistId: id },
    orderBy: { position: "asc" },
    include: { _count: { select: { media: true } } },
  });

  return ok({
    albums: albums.map((album) => ({
      id: album.id,
      name: album.name,
      category: album.category,
      isPublic: album.isPublic,
      position: album.position,
      mediaCount: album._count.media,
    })),
  });
});

export const POST = handle(async (request: Request, { params }: Params) => {
  const { id } = await params;
  await requireArtistAccess(id, { write: true });

  const body = await readJson(request);
  const name = requireString(body, "name", { max: 80 });
  const category = requireString(body, "category", { max: 40 });
  if (!isValidCategory(category)) {
    throw new ApiError("Categoria inválida.", 400, "invalid_category");
  }

  const count = await db.album.count({ where: { artistId: id } });
  const album = await db.album.create({
    data: {
      artistId: id,
      name,
      category,
      isPublic: requireBool(body, "isPublic", false),
      position: count,
    },
  });

  return ok({ id: album.id, name: album.name, category: album.category }, { status: 201 });
});
