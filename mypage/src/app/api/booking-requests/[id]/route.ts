import { db } from "@/lib/db";
import { requireArtistAccess } from "@/lib/auth";
import { ApiError, handle, ok, optionalString, readJson, requireEnum } from "@/lib/api";
import {
  BOOKING_STATUSES,
  type BookingStatus,
  assertTransition,
  assertValidInterval,
  findOverlap,
} from "@/lib/booking";
import { notify } from "@/lib/notify";

interface Params {
  params: Promise<{ id: string }>;
}

export const PATCH = handle(async (request: Request, { params }: Params) => {
  const { id } = await params;

  const existing = await db.bookingRequest.findUnique({ where: { id } });
  if (!existing) throw new ApiError("Pedido não encontrado.", 404, "not_found");
  await requireArtistAccess(existing.artistId, { write: true });

  const body = await readJson(request);
  const data: Record<string, unknown> = {};

  // A private note may be edited without changing state.
  if (body.privateNote !== undefined) {
    data.privateNote = optionalString(body, "privateNote", 4000);
  }

  if (body.status === undefined) {
    if (Object.keys(data).length === 0) throw new ApiError("Nada para atualizar.", 400, "no_changes");
    const updated = await db.bookingRequest.update({ where: { id }, data });
    return ok({ id: updated.id, status: updated.status });
  }

  const from = existing.status as BookingStatus;
  const to = requireEnum(body, "status", BOOKING_STATUSES);
  assertTransition(from, to);

  let availabilityId: string | null = existing.availabilityId;

  // Confirming is the only transition that touches the calendar, and it does so
  // explicitly — never as a side effect of receiving the request.
  if (to === "confirmed") {
    const startsAt = existing.requestedDate ?? existing.flexibleFrom;
    const endsAt =
      existing.dateMode === "specific" && existing.requestedDate
        ? new Date(existing.requestedDate.getTime() + 24 * 60 * 60 * 1000)
        : existing.flexibleTo;

    if (!startsAt || !endsAt) {
      throw new ApiError(
        "Este pedido não tem datas suficientes para bloquear o calendário. Define a data com o promotor antes de confirmar.",
        409,
        "missing_dates",
      );
    }

    assertValidInterval({ startsAt, endsAt });
    const overlap = await findOverlap(existing.artistId, { startsAt, endsAt }, existing.availabilityId ?? undefined);
    if (overlap && overlap.status !== "available") {
      throw new ApiError(
        "Já existe um compromisso neste intervalo. Resolve o conflito antes de confirmar.",
        409,
        "conflict",
        { conflictId: overlap.id },
      );
    }

    const slot = await db.availability.create({
      data: {
        artistId: existing.artistId,
        startsAt,
        endsAt,
        timezone: existing.timezone,
        status: "busy",
        privateNote: `Confirmado: ${existing.promoterName}`,
      },
    });
    availabilityId = slot.id;
  }

  // Releasing a confirmed booking frees the slot again.
  if (from === "confirmed" && to === "cancelled" && existing.availabilityId) {
    await db.availability.deleteMany({ where: { id: existing.availabilityId, artistId: existing.artistId } });
    availabilityId = null;
  }

  const updated = await db.$transaction(async (tx) => {
    const row = await tx.bookingRequest.update({
      where: { id },
      data: { ...data, status: to, availabilityId },
    });
    await tx.bookingStatusChange.create({
      data: {
        requestId: id,
        fromStatus: from,
        toStatus: to,
        note: optionalString(body, "note", 1000),
      },
    });
    return row;
  });

  // Keyed on the transition, so replaying the same change notifies once.
  await notify({
    artistId: existing.artistId,
    dedupeKey: `booking.status:${id}:${from}->${to}`,
    type: "booking.status",
    title: "Pedido de booking atualizado",
    body: `${existing.promoterName}: ${from} → ${to}.`,
    href: `/studio/booking?request=${id}`,
  });

  return ok({ id: updated.id, status: updated.status, availabilityId });
});

export const DELETE = handle(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  const existing = await db.bookingRequest.findUnique({ where: { id } });
  if (!existing) throw new ApiError("Pedido não encontrado.", 404, "not_found");
  await requireArtistAccess(existing.artistId, { write: true });

  if (existing.availabilityId) {
    await db.availability.deleteMany({ where: { id: existing.availabilityId } });
  }
  await db.bookingRequest.delete({ where: { id } });
  return ok({ deleted: true });
});
