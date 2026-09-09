import type { Metadata } from "next";
import { EventsManager, type EventRow } from "@/components/studio/EventsManager";
import { db } from "@/lib/db";
import { getMuskaAdapter } from "@/lib/muska";
import { requireStudioContext } from "@/lib/studio";

export const metadata: Metadata = { title: "Eventos" };

export default async function EventsPage() {
  const { artist } = await requireStudioContext();

  const [events, images] = await Promise.all([
    db.event.findMany({
      where: { artistId: artist.id, isArchived: false },
      orderBy: { startsAt: "asc" },
      take: 100,
    }),
    db.media.findMany({
      where: { artistId: artist.id, kind: "image", status: "ready" },
      select: { id: true, title: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  const rows: EventRow[] = events.map((event) => ({
    id: event.id,
    source: event.source,
    title: event.title,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt?.toISOString() ?? null,
    venue: event.venue,
    city: event.city,
    country: event.country,
    description: event.description,
    ticketsUrl: event.ticketsUrl,
    posterUrl: event.posterUrl,
    posterMediaId: event.posterMediaId,
    isArchived: event.isArchived,
    editable: event.source === "manual",
  }));

  return (
    <EventsManager
      artistId={artist.id}
      initialEvents={rows}
      images={images}
      muskaConnected={getMuskaAdapter().status().connected}
    />
  );
}
