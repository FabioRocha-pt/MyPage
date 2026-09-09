import { db } from "@/lib/db";
import { requireArtistAccess } from "@/lib/auth";
import { ApiError, handle, ok, optionalString, readJson, requireDate, requireEnum } from "@/lib/api";
import {
  AVAILABILITY_STATUSES,
  assertValidInterval,
  findEventConflicts,
  findOverlap,
} from "@/lib/booking";

interface Params {
  params: Promise<{ id: string }>;
}

export const GET = handle(async (request: Request, { params }: Params) => {
  const { id } = await params;
  await requireArtistAccess(id);

  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const slots = await db.availability.findMany({
    where: {
      artistId: id,
      ...(from ? { endsAt: { gte: new Date(from) } } : {}),
      ...(to ? { startsAt: { lte: new Date(to) } } : {}),
    },
    orderBy: { startsAt: "asc" },
    take: 500,
  });

  const events = await db.event.findMany({
    where: { artistId: id, isArchived: false },
    orderBy: { startsAt: "asc" },
    select: { id: true, title: true, startsAt: true },
    take: 500,
  });

  return ok({
    // privateNote is included here because this endpoint is behind
    // requireArtistAccess. It is absent from the public snapshot by design.
    slots: slots.map((slot) => ({
      id: slot.id,
      startsAt: slot.startsAt.toISOString(),
      endsAt: slot.endsAt.toISOString(),
      timezone: slot.timezone,
      status: slot.status,
      privateNote: slot.privateNote,
      holdExpiresAt: slot.holdExpiresAt?.toISOString() ?? null,
      expired: slot.holdExpiresAt ? slot.holdExpiresAt < new Date() : false,
    })),
    events: events.map((event) => ({
      id: event.id,
      title: event.title,
      startsAt: event.startsAt.toISOString(),
    })),
  });
});

export const POST = handle(async (request: Request, { params }: Params) => {
  const { id } = await params;
  await requireArtistAccess(id, { write: true });

  const body = await readJson(request);
  const startsAt = requireDate(body, "startsAt");
  const endsAt = requireDate(body, "endsAt");
  assertValidInterval({ startsAt, endsAt });

  const overlap = await findOverlap(id, { startsAt, endsAt });
  if (overlap) {
    throw new ApiError(
      "Este intervalo sobrepõe-se a outro já definido. Edita a disponibilidade existente.",
      409,
      "overlapping_interval",
      {
        conflict: {
          id: overlap.id,
          startsAt: overlap.startsAt.toISOString(),
          endsAt: overlap.endsAt.toISOString(),
          status: overlap.status,
        },
      },
    );
  }

  const status = requireEnum(body, "status", AVAILABILITY_STATUSES);
  const conflicts = await findEventConflicts(id, { startsAt, endsAt });

  const slot = await db.availability.create({
    data: {
      artistId: id,
      startsAt,
      endsAt,
      timezone: optionalString(body, "timezone", 60) ?? "Atlantic/Cape_Verde",
      status,
      privateNote: optionalString(body, "privateNote", 1000),
      holdExpiresAt:
        status === "hold" ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) : null,
    },
  });

  return ok(
    {
      id: slot.id,
      startsAt: slot.startsAt.toISOString(),
      endsAt: slot.endsAt.toISOString(),
      status: slot.status,
      // Reported, not blocked: being available around a show is legitimate.
      eventConflicts: conflicts.map((event) => ({
        id: event.id,
        title: event.title,
        startsAt: event.startsAt.toISOString(),
      })),
    },
    { status: 201 },
  );
});
