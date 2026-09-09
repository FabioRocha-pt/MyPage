import { db } from "@/lib/db";
import { requireArtistAccess } from "@/lib/auth";
import { ApiError, handle, ok, optionalDate, optionalString, readJson } from "@/lib/api";
import { normaliseUrl } from "@/lib/platforms";

interface Params {
  params: Promise<{ id: string }>;
}

async function loadOwned(id: string) {
  const event = await db.event.findUnique({ where: { id } });
  if (!event) throw new ApiError("Evento não encontrado.", 404, "not_found");
  await requireArtistAccess(event.artistId, { write: true });
  return event;
}

export const PATCH = handle(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const event = await loadOwned(id);

  if (event.source !== "manual") {
    throw new ApiError(
      "Este evento vem do catálogo Muska e é gerido lá. Edita-o na origem para não perder alterações na próxima sincronização.",
      409,
      "read_only_source",
    );
  }

  const body = await readJson(request);
  const data: Record<string, unknown> = {};

  if (typeof body.title === "string" && body.title.trim()) data.title = body.title.trim().slice(0, 160);
  const startsAt = optionalDate(body, "startsAt");
  const endsAt = optionalDate(body, "endsAt");
  if (startsAt) data.startsAt = startsAt;
  if (body.endsAt !== undefined) data.endsAt = endsAt;

  const effectiveStart = startsAt ?? event.startsAt;
  const effectiveEnd = endsAt ?? event.endsAt;
  if (effectiveEnd && effectiveEnd <= effectiveStart) {
    throw new ApiError("O fim do evento deve ser posterior ao início.", 400, "invalid_range");
  }

  for (const field of ["venue", "city", "country", "description", "timezone"] as const) {
    if (body[field] !== undefined) data[field] = optionalString(body, field, 4000);
  }

  for (const field of ["ticketsUrl", "posterUrl"] as const) {
    if (body[field] === undefined) continue;
    const raw = optionalString(body, field, 2000);
    if (!raw) {
      data[field] = null;
      continue;
    }
    const url = normaliseUrl(raw);
    if (!url) throw new ApiError(`Link inválido em ${field}.`, 400, "invalid_url");
    data[field] = url;
  }

  if (body.posterMediaId !== undefined) {
    if (!body.posterMediaId) {
      data.posterMediaId = null;
    } else {
      const media = await db.media.findFirst({
        where: { id: String(body.posterMediaId), artistId: event.artistId, kind: "image" },
        select: { id: true },
      });
      if (!media) throw new ApiError("Cartaz não encontrado.", 404, "media_not_found");
      data.posterMediaId = media.id;
    }
  }

  const updated = await db.event.update({ where: { id }, data });
  return ok({ id: updated.id, title: updated.title, startsAt: updated.startsAt.toISOString() });
});

export const DELETE = handle(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  const event = await loadOwned(id);

  if (event.source !== "manual") {
    // Archive rather than delete so the next sync does not resurrect it.
    await db.event.update({ where: { id }, data: { isArchived: true } });
    return ok({ archived: true });
  }

  await db.event.delete({ where: { id } });
  return ok({ deleted: true });
});
