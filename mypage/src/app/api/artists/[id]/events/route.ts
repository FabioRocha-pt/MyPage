import { db } from "@/lib/db";
import { requireArtistAccess } from "@/lib/auth";
import {
  ApiError,
  handle,
  ok,
  optionalDate,
  optionalString,
  paged,
  pagination,
  readJson,
  requireDate,
  requireString,
} from "@/lib/api";
import { assertEventQuota } from "@/lib/entitlements";
import { normaliseUrl } from "@/lib/platforms";
import { getMuskaAdapter, looksLikeSameEvent } from "@/lib/muska";

/**
 * Doc 03: "Eventos | CRUD manual + sincronização por source/external_id."
 * Doc 02: "Definir como eventos manuais são migrados/reconciliados para não
 * duplicar registos." — see the sync action below.
 */

interface Params {
  params: Promise<{ id: string }>;
}

export const GET = handle(async (request: Request, { params }: Params) => {
  const { id } = await params;
  await requireArtistAccess(id);

  const url = new URL(request.url);
  const includeArchived = url.searchParams.get("archived") === "1";
  const page = pagination(request, { defaultPerPage: 50 });

  const where = { artistId: id, ...(includeArchived ? {} : { isArchived: false }) };

  const [items, total] = await Promise.all([
    db.event.findMany({ where, orderBy: { startsAt: "asc" }, take: page.take, skip: page.skip }),
    db.event.count({ where }),
  ]);

  return ok(
    paged(
      items.map((event) => ({
        id: event.id,
        source: event.source,
        externalId: event.externalId,
        title: event.title,
        startsAt: event.startsAt.toISOString(),
        endsAt: event.endsAt?.toISOString() ?? null,
        timezone: event.timezone,
        venue: event.venue,
        city: event.city,
        country: event.country,
        description: event.description,
        ticketsUrl: event.ticketsUrl,
        posterMediaId: event.posterMediaId,
        posterUrl: event.posterUrl,
        isArchived: event.isArchived,
        // Muska-sourced rows are read-only locally so a sync cannot lose edits.
        editable: event.source === "manual",
      })),
      total,
      page,
    ),
  );
});

export const POST = handle(async (request: Request, { params }: Params) => {
  const { id } = await params;
  await requireArtistAccess(id, { write: true });

  const body = await readJson(request);

  // --- Sync action -----------------------------------------------------------

  if (body.action === "sync") {
    const artist = await db.artist.findUnique({ where: { id }, select: { muskaId: true } });
    const adapter = getMuskaAdapter();
    const status = adapter.status();

    if (!status.connected || !artist?.muskaId) {
      throw new ApiError(status.message, 503, "integration_pending");
    }

    const remote = await adapter.listEvents(artist.muskaId);
    const local = await db.event.findMany({ where: { artistId: id } });
    let created = 0;
    let updated = 0;
    let reconciled = 0;

    for (const incoming of remote.items) {
      const startsAt = new Date(incoming.startsAt);
      const existing = local.find((e) => e.source === "muska" && e.externalId === incoming.externalId);

      if (existing) {
        await db.event.update({
          where: { id: existing.id },
          data: {
            title: incoming.title,
            startsAt,
            venue: incoming.venue,
            city: incoming.city,
            country: incoming.country,
            description: incoming.description,
            ticketsUrl: incoming.ticketsUrl,
            posterUrl: incoming.posterUrl,
            isArchived: false,
          },
        });
        updated += 1;
        continue;
      }

      // Promote a manual duplicate instead of inserting a second row.
      const duplicate = local.find(
        (e) => e.source === "manual" && looksLikeSameEvent(e, { title: incoming.title, startsAt }),
      );
      if (duplicate) {
        await db.event.update({
          where: { id: duplicate.id },
          data: { source: "muska", externalId: incoming.externalId, startsAt, isArchived: false },
        });
        reconciled += 1;
        continue;
      }

      await db.event.create({
        data: {
          artistId: id,
          source: "muska",
          externalId: incoming.externalId,
          title: incoming.title,
          startsAt,
          timezone: incoming.timezone,
          venue: incoming.venue,
          city: incoming.city,
          country: incoming.country,
          description: incoming.description,
          ticketsUrl: incoming.ticketsUrl,
          posterUrl: incoming.posterUrl,
        },
      });
      created += 1;
    }

    // A Muska event that vanished is archived, never deleted: doc 04 asks that
    // "conteúdo removido/privado no catálogo é tratado corretamente".
    const remoteIds = new Set(remote.items.map((e) => e.externalId));
    const archived = await db.event.updateMany({
      where: { artistId: id, source: "muska", externalId: { notIn: [...remoteIds] } },
      data: { isArchived: true },
    });

    return ok({ synced: true, created, updated, reconciled, archived: archived.count });
  }

  // --- Manual create ---------------------------------------------------------

  await assertEventQuota(id);

  const title = requireString(body, "title", { max: 160 });
  const startsAt = requireDate(body, "startsAt");
  const endsAt = optionalDate(body, "endsAt");
  if (endsAt && endsAt <= startsAt) {
    throw new ApiError("O fim do evento deve ser posterior ao início.", 400, "invalid_range");
  }

  const ticketsRaw = optionalString(body, "ticketsUrl", 2000);
  const ticketsUrl = ticketsRaw ? normaliseUrl(ticketsRaw) : null;
  if (ticketsRaw && !ticketsUrl) throw new ApiError("Link de bilhetes inválido.", 400, "invalid_url");

  const posterRaw = optionalString(body, "posterUrl", 2000);
  const posterUrl = posterRaw ? normaliseUrl(posterRaw) : null;
  if (posterRaw && !posterUrl) throw new ApiError("Link do cartaz inválido.", 400, "invalid_url");

  let posterMediaId: string | null = null;
  if (typeof body.posterMediaId === "string" && body.posterMediaId) {
    const media = await db.media.findFirst({
      where: { id: body.posterMediaId, artistId: id, kind: "image" },
      select: { id: true },
    });
    if (!media) throw new ApiError("Cartaz não encontrado na biblioteca.", 404, "media_not_found");
    posterMediaId = media.id;
  }

  const event = await db.event.create({
    data: {
      artistId: id,
      source: "manual",
      title,
      startsAt,
      endsAt,
      timezone: optionalString(body, "timezone", 60) ?? "Atlantic/Cape_Verde",
      venue: optionalString(body, "venue", 160),
      city: optionalString(body, "city", 80),
      country: optionalString(body, "country", 80),
      description: optionalString(body, "description", 4000),
      ticketsUrl,
      posterUrl,
      posterMediaId,
    },
  });

  return ok({ id: event.id, title: event.title }, { status: 201 });
});
