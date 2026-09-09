import { db } from "@/lib/db";
import { requireArtistAccess } from "@/lib/auth";
import { ApiError, handle, ok, optionalDate, optionalString, readJson, requireEnum } from "@/lib/api";
import { AVAILABILITY_STATUSES, assertValidInterval, findOverlap } from "@/lib/booking";

interface Params {
  params: Promise<{ id: string }>;
}

async function loadOwned(id: string) {
  const slot = await db.availability.findUnique({ where: { id } });
  if (!slot) throw new ApiError("Intervalo não encontrado.", 404, "not_found");
  await requireArtistAccess(slot.artistId, { write: true });
  return slot;
}

export const PATCH = handle(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const slot = await loadOwned(id);
  const body = await readJson(request);

  const startsAt = optionalDate(body, "startsAt") ?? slot.startsAt;
  const endsAt = optionalDate(body, "endsAt") ?? slot.endsAt;
  assertValidInterval({ startsAt, endsAt });

  const overlap = await findOverlap(slot.artistId, { startsAt, endsAt }, id);
  if (overlap) {
    throw new ApiError("Este intervalo sobrepõe-se a outro já definido.", 409, "overlapping_interval");
  }

  const data: Record<string, unknown> = { startsAt, endsAt };
  if (body.status !== undefined) {
    const status = requireEnum(body, "status", AVAILABILITY_STATUSES);
    data.status = status;
    data.holdExpiresAt = status === "hold" ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) : null;
  }
  if (body.privateNote !== undefined) data.privateNote = optionalString(body, "privateNote", 1000);
  if (body.timezone !== undefined) data.timezone = optionalString(body, "timezone", 60) ?? slot.timezone;

  const updated = await db.availability.update({ where: { id }, data });
  return ok({
    id: updated.id,
    startsAt: updated.startsAt.toISOString(),
    endsAt: updated.endsAt.toISOString(),
    status: updated.status,
  });
});

export const DELETE = handle(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  await loadOwned(id);
  await db.availability.delete({ where: { id } });
  return ok({ deleted: true });
});
