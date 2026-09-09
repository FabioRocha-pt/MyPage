import { db } from "@/lib/db";
import { requireArtistAccess } from "@/lib/auth";
import { ApiError, handle, ok, optionalEnum, readJson } from "@/lib/api";
import { normaliseUrl } from "@/lib/platforms";

interface Params {
  params: Promise<{ id: string }>;
}

async function loadOwned(id: string) {
  const link = await db.externalLink.findUnique({ where: { id } });
  if (!link) throw new ApiError("Ligação não encontrada.", 404, "not_found");
  await requireArtistAccess(link.artistId, { write: true });
  return link;
}

export const PATCH = handle(async (request: Request, { params }: Params) => {
  const { id } = await params;
  await loadOwned(id);
  const body = await readJson(request);

  const data: Record<string, unknown> = {};
  if (typeof body.url === "string") {
    const url = normaliseUrl(body.url);
    if (!url) throw new ApiError("Usa um link http(s) válido.", 400, "invalid_url");
    data.url = url;
  }
  if (body.label !== undefined) {
    data.label = typeof body.label === "string" && body.label.trim() ? body.label.trim().slice(0, 80) : null;
  }
  if (body.placement !== undefined) {
    data.placement = optionalEnum(body, "placement", ["hero", "section", "both"] as const, "section");
  }
  if (body.position !== undefined) data.position = Number(body.position) || 0;

  const link = await db.externalLink.update({ where: { id }, data });
  return ok({ id: link.id, url: link.url, placement: link.placement });
});

export const DELETE = handle(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  await loadOwned(id);
  await db.externalLink.delete({ where: { id } });
  return ok({ deleted: true });
});
