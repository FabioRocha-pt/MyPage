import { db } from "@/lib/db";
import { requireArtistAccess } from "@/lib/auth";
import { ApiError, handle, ok, readJson, requireBool, requireString } from "@/lib/api";
import { PRESS_CATEGORIES, isValidCategory } from "@/lib/press";
import { normaliseUrl } from "@/lib/platforms";

/**
 * Shared-folder links per press-kit category.
 * Doc 02: "Cada categoria pode ter link Google Drive/outro e opção pública.
 * (…) Não exigir integração Google Drive para aceitar links."
 */

interface Params {
  params: Promise<{ id: string }>;
}

export const GET = handle(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  await requireArtistAccess(id);

  const rows = await db.pressLink.findMany({ where: { artistId: id } });
  const byCategory = new Map(rows.map((row) => [row.category, row]));

  return ok({
    categories: PRESS_CATEGORIES.map((category) => {
      const row = byCategory.get(category.id);
      return {
        ...category,
        url: row?.url ?? "",
        isPublic: row?.isPublic ?? false,
      };
    }),
  });
});

export const PUT = handle(async (request: Request, { params }: Params) => {
  const { id } = await params;
  await requireArtistAccess(id, { write: true });

  const body = await readJson(request);
  const category = requireString(body, "category", { max: 40 });
  if (!isValidCategory(category)) throw new ApiError("Categoria inválida.", 400, "invalid_category");

  const rawUrl = typeof body.url === "string" ? body.url.trim() : "";

  if (!rawUrl) {
    await db.pressLink.deleteMany({ where: { artistId: id, category } });
    return ok({ category, url: "", isPublic: false });
  }

  const url = normaliseUrl(rawUrl);
  if (!url) throw new ApiError("Usa um link http(s) válido.", 400, "invalid_url");

  const isPublic = requireBool(body, "isPublic", false);

  const row = await db.pressLink.upsert({
    where: { artistId_category: { artistId: id, category } },
    update: { url, isPublic },
    create: { artistId: id, category, url, isPublic },
  });

  return ok({ category: row.category, url: row.url, isPublic: row.isPublic });
});
