import { db } from "./db";
import { ApiError } from "./api";

/**
 * Booking domain rules.
 *
 * Doc 04, etapa 5 acceptance:
 *   "intervalo inválido/conflito é tratado; pedido não confirma automaticamente
 *    data; notas privadas não são expostas; fusos e intervalos que passam a
 *    meia-noite funcionam; notificações não duplicam."
 *
 * Timezones: every instant is stored as UTC and the wall-clock zone is kept
 * alongside it. An interval that crosses midnight is just an interval whose end
 * is on the next day — there is no special case, because nothing here reasons
 * in calendar days. The calendar UI expands intervals into days for display
 * only.
 */

export const BOOKING_STATUSES = [
  "new",
  "in_contact",
  "proposal",
  "confirmed",
  "declined",
  "cancelled",
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/**
 * Doc 02: "Gestão pretendida: novo → em contacto → proposta →
 * confirmado/recusado/cancelado."
 * A request can always be cancelled or declined; it cannot jump straight from
 * new to confirmed, which is what stops a request from silently becoming a
 * booking ("pedido não equivale a reserva confirmada").
 */
const TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  new: ["in_contact", "declined", "cancelled"],
  in_contact: ["proposal", "declined", "cancelled"],
  proposal: ["confirmed", "declined", "cancelled"],
  confirmed: ["cancelled"],
  declined: [],
  cancelled: [],
};

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(from: BookingStatus, to: BookingStatus): void {
  if (from === to) {
    throw new ApiError("O pedido já está neste estado.", 409, "no_change");
  }
  if (!canTransition(from, to)) {
    const allowed = TRANSITIONS[from];
    throw new ApiError(
      allowed.length
        ? `Transição inválida: de "${from}" só é possível ir para ${allowed.join(", ")}.`
        : `Um pedido "${from}" é final e não pode mudar de estado.`,
      409,
      "invalid_transition",
      { from, to, allowed },
    );
  }
}

export const AVAILABILITY_STATUSES = ["available", "busy", "hold"] as const;
export type AvailabilityStatus = (typeof AVAILABILITY_STATUSES)[number];

/** Provisional holds expire so a stale one cannot block the calendar forever. */
export const HOLD_DURATION_HOURS = 14 * 24;

export interface IntervalInput {
  startsAt: Date;
  endsAt: Date;
}

export function assertValidInterval({ startsAt, endsAt }: IntervalInput): void {
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    throw new ApiError("Datas inválidas.", 400, "invalid_date");
  }
  if (endsAt <= startsAt) {
    throw new ApiError("O fim deve ser posterior ao início.", 400, "invalid_range");
  }
  const days = (endsAt.getTime() - startsAt.getTime()) / (24 * 60 * 60 * 1000);
  if (days > 366) {
    throw new ApiError("Um intervalo não pode exceder um ano.", 400, "range_too_long");
  }
}

/**
 * Overlap detection, matching the prototype's rule
 * (`s.start < data.end && s.end > data.start`) but run on the server.
 * Touching intervals (one ends exactly when the next begins) do not overlap.
 */
export async function findOverlap(
  artistId: string,
  interval: IntervalInput,
  excludeId?: string,
) {
  return db.availability.findFirst({
    where: {
      artistId,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
      startsAt: { lt: interval.endsAt },
      endsAt: { gt: interval.startsAt },
    },
    select: { id: true, startsAt: true, endsAt: true, status: true },
  });
}

/**
 * Events that fall inside a requested interval. Doc 04 asks that conflicts with
 * existing events are surfaced; they are reported as a warning rather than a
 * hard block, because an artist may legitimately be available around a show.
 */
export async function findEventConflicts(artistId: string, interval: IntervalInput) {
  return db.event.findMany({
    where: {
      artistId,
      isArchived: false,
      startsAt: { gte: interval.startsAt, lte: interval.endsAt },
    },
    select: { id: true, title: true, startsAt: true },
    take: 10,
  });
}

/** Expands intervals into a per-day map for the calendar grid. */
export function expandToDays(
  intervals: Array<{ startsAt: Date; endsAt: Date; status: string; id: string }>,
): Map<string, Array<{ id: string; status: string }>> {
  const days = new Map<string, Array<{ id: string; status: string }>>();

  for (const interval of intervals) {
    const cursor = new Date(
      Date.UTC(
        interval.startsAt.getUTCFullYear(),
        interval.startsAt.getUTCMonth(),
        interval.startsAt.getUTCDate(),
      ),
    );
    const last = new Date(
      Date.UTC(
        interval.endsAt.getUTCFullYear(),
        interval.endsAt.getUTCMonth(),
        interval.endsAt.getUTCDate(),
      ),
    );

    // Guard against a pathological range producing an unbounded loop.
    let iterations = 0;
    while (cursor <= last && iterations < 400) {
      const key = cursor.toISOString().slice(0, 10);
      const bucket = days.get(key) ?? [];
      bucket.push({ id: interval.id, status: interval.status });
      days.set(key, bucket);
      cursor.setUTCDate(cursor.getUTCDate() + 1);
      iterations += 1;
    }
  }

  return days;
}
