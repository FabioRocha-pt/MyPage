import type { Metadata } from "next";
import { BookingManager, type BookingRow, type CalendarEvent, type Slot } from "@/components/studio/BookingManager";
import { db } from "@/lib/db";
import { requireStudioContext } from "@/lib/studio";

export const metadata: Metadata = { title: "Booking" };

export default async function BookingPage() {
  const { artist } = await requireStudioContext();

  const [slots, events, requests] = await Promise.all([
    db.availability.findMany({ where: { artistId: artist.id }, orderBy: { startsAt: "asc" }, take: 500 }),
    db.event.findMany({
      where: { artistId: artist.id, isArchived: false },
      orderBy: { startsAt: "asc" },
      select: { id: true, title: true, startsAt: true },
      take: 500,
    }),
    db.bookingRequest.findMany({ where: { artistId: artist.id }, orderBy: { createdAt: "desc" }, take: 50 }),
  ]);

  const now = new Date();

  const slotRows: Slot[] = slots.map((slot) => ({
    id: slot.id,
    startsAt: slot.startsAt.toISOString(),
    endsAt: slot.endsAt.toISOString(),
    status: slot.status,
    privateNote: slot.privateNote,
    holdExpiresAt: slot.holdExpiresAt?.toISOString() ?? null,
    expired: slot.holdExpiresAt ? slot.holdExpiresAt < now : false,
  }));

  const eventRows: CalendarEvent[] = events.map((event) => ({
    id: event.id,
    title: event.title,
    startsAt: event.startsAt.toISOString(),
  }));

  const requestRows: BookingRow[] = requests.map((row) => ({
    id: row.id,
    promoterName: row.promoterName,
    promoterEmail: row.promoterEmail,
    promoterPhone: row.promoterPhone,
    organisation: row.organisation,
    dateMode: row.dateMode,
    requestedDate: row.requestedDate?.toISOString() ?? null,
    flexibleFrom: row.flexibleFrom?.toISOString() ?? null,
    flexibleTo: row.flexibleTo?.toISOString() ?? null,
    city: row.city,
    country: row.country,
    venue: row.venue,
    eventType: row.eventType,
    message: row.message,
    status: row.status,
    privateNote: row.privateNote,
    createdAt: row.createdAt.toISOString(),
  }));

  return (
    <BookingManager
      artistId={artist.id}
      initialSlots={slotRows}
      initialEvents={eventRows}
      initialRequests={requestRows}
      timezone="Atlantic/Cape_Verde"
    />
  );
}
