import { db } from "@/lib/db";
import { requireArtistAccess } from "@/lib/auth";
import {
  ApiError,
  clientKey,
  handle,
  ok,
  optionalDate,
  optionalInt,
  optionalString,
  paged,
  pagination,
  rateLimit,
  readJson,
  requireEnum,
  requireString,
} from "@/lib/api";
import { BOOKING_STATUSES } from "@/lib/booking";
import { notify } from "@/lib/notify";
import { getEntitlement } from "@/lib/entitlements";

/**
 * PUBLIC endpoint: a promoter submits a booking request from an artist's page.
 *
 * Doc 02: "Front final: pedir data específica ou pedido aberto/flexível;
 * contacto do promotor, local, contexto e mensagem. Pedido não equivale a
 * reserva confirmada." The row is therefore created with status "new" and no
 * availability is touched — confirmation is a separate, authenticated action.
 */
export const POST = handle(async (request: Request) => {
  rateLimit(clientKey(request, "booking"), 5, 15 * 60 * 1000);

  const body = await readJson(request);
  const slug = requireString(body, "slug", { max: 64 }).toLowerCase();

  // Resolve through the published page: a request cannot be filed against an
  // unpublished artist, and the slug never leaks an internal id.
  const published = await db.publishedPage.findFirst({
    where: { slug, isLive: true },
    select: { artistId: true, snapshot: true },
  });
  if (!published) throw new ApiError("Página não encontrada.", 404, "not_found");

  const snapshot = JSON.parse(published.snapshot) as { booking?: { enabled?: boolean } };
  if (!snapshot.booking?.enabled) {
    throw new ApiError("Esta página não está a receber pedidos de booking.", 409, "booking_disabled");
  }

  const artist = await db.artist.findUnique({
    where: { id: published.artistId },
    select: { id: true, plan: true },
  });
  if (!artist) throw new ApiError("Página não encontrada.", 404, "not_found");

  const entitlement = await getEntitlement(artist.plan);
  if (!entitlement.tools.includes("booking")) {
    throw new ApiError("Esta página não está a receber pedidos de booking.", 409, "booking_disabled");
  }

  const promoterName = requireString(body, "promoterName", { max: 120 });
  const promoterEmail = requireString(body, "promoterEmail", { max: 200 });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(promoterEmail)) {
    throw new ApiError("Email inválido.", 400, "invalid_email");
  }

  const dateMode = requireEnum(body, "dateMode", ["specific", "flexible"] as const);
  const requestedDate = optionalDate(body, "requestedDate");
  const flexibleFrom = optionalDate(body, "flexibleFrom");
  const flexibleTo = optionalDate(body, "flexibleTo");

  if (dateMode === "specific" && !requestedDate) {
    throw new ApiError("Indica a data pretendida.", 400, "missing_date");
  }
  if (dateMode === "flexible") {
    if (!flexibleFrom || !flexibleTo) {
      throw new ApiError("Indica o intervalo de datas possível.", 400, "missing_range");
    }
    if (flexibleTo <= flexibleFrom) {
      throw new ApiError("O fim do intervalo deve ser posterior ao início.", 400, "invalid_range");
    }
  }

  const created = await db.bookingRequest.create({
    data: {
      artistId: artist.id,
      promoterName,
      promoterEmail: promoterEmail.toLowerCase(),
      promoterPhone: optionalString(body, "promoterPhone", 40),
      organisation: optionalString(body, "organisation", 160),
      dateMode,
      requestedDate: dateMode === "specific" ? requestedDate : null,
      flexibleFrom: dateMode === "flexible" ? flexibleFrom : null,
      flexibleTo: dateMode === "flexible" ? flexibleTo : null,
      timezone: optionalString(body, "timezone", 60) ?? "Atlantic/Cape_Verde",
      city: optionalString(body, "city", 80),
      country: optionalString(body, "country", 80),
      venue: optionalString(body, "venue", 160),
      eventType: optionalString(body, "eventType", 120),
      message: optionalString(body, "message", 4000),
      budgetMinor: optionalInt(body, "budgetMinor", { min: 0, max: 10_000_000_00 }),
      status: "new",
      history: { create: { toStatus: "new", note: "Pedido recebido pelo formulário público." } },
    },
  });

  await notify({
    artistId: artist.id,
    dedupeKey: `booking.created:${created.id}`,
    type: "booking.created",
    title: "Novo pedido de booking",
    body: `${promoterName} enviou um pedido${created.requestedDate ? ` para ${created.requestedDate.toISOString().slice(0, 10)}` : " com datas flexíveis"}.`,
    href: `/studio/booking?request=${created.id}`,
  });

  return ok(
    {
      received: true,
      id: created.id,
      // Wording matters: doc 02 insists a request is not a confirmed booking.
      message:
        "Pedido enviado. Isto não é uma reserva confirmada — o artista entrará em contacto para responder.",
    },
    { status: 201 },
  );
});

/** Authenticated listing for the backoffice inbox. */
export const GET = handle(async (request: Request) => {
  const url = new URL(request.url);
  const artistId = url.searchParams.get("artistId");
  if (!artistId) throw new ApiError("artistId em falta.", 400, "missing_artist");
  await requireArtistAccess(artistId);

  const status = url.searchParams.get("status");
  const page = pagination(request, { defaultPerPage: 25 });
  const where = {
    artistId,
    ...(status && BOOKING_STATUSES.includes(status as never) ? { status } : {}),
  };

  const [items, total] = await Promise.all([
    db.bookingRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: page.take,
      skip: page.skip,
      include: { history: { orderBy: { createdAt: "asc" } } },
    }),
    db.bookingRequest.count({ where }),
  ]);

  return ok(
    paged(
      items.map((item) => ({
        id: item.id,
        promoterName: item.promoterName,
        promoterEmail: item.promoterEmail,
        promoterPhone: item.promoterPhone,
        organisation: item.organisation,
        dateMode: item.dateMode,
        requestedDate: item.requestedDate?.toISOString() ?? null,
        flexibleFrom: item.flexibleFrom?.toISOString() ?? null,
        flexibleTo: item.flexibleTo?.toISOString() ?? null,
        city: item.city,
        country: item.country,
        venue: item.venue,
        eventType: item.eventType,
        message: item.message,
        budgetMinor: item.budgetMinor,
        currency: item.currency,
        status: item.status,
        privateNote: item.privateNote,
        createdAt: item.createdAt.toISOString(),
        history: item.history.map((entry) => ({
          from: entry.fromStatus,
          to: entry.toStatus,
          note: entry.note,
          at: entry.createdAt.toISOString(),
        })),
      })),
      total,
      page,
    ),
  );
});
