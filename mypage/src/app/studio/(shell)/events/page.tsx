import type { Metadata } from "next";
import { EventsManager, type EventRow } from "@/components/studio/EventsManager";
import { load } from "@/lib/data";

export const metadata: Metadata = { title: "Eventos" };

export default async function EventsPage() {
  const {
    context: { artist },
    rows: [events, images],
    muskaConnected,
  } = await load.studioEvents();

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
      muskaConnected={muskaConnected}
    />
  );
}
