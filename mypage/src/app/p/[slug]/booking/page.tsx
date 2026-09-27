import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { snapshotContent } from "@/lib/page-model";
import { loadPublishedSnapshot } from "@/lib/published";
import { PageRenderer } from "@/templates/PageRenderer";
import "@/styles/templates.css";

/**
 * The booking page of Template 02 · versão 1 (the handoff's `booking.html`):
 * request form, technical rider with the connection diagram, hospitality.
 *
 * Only Template 02 has it. For any other template, or when the page neither
 * takes requests nor shows a public rider, the address does not exist.
 */

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const snapshot = await loadPublishedSnapshot(slug);
  if (!snapshot) return { title: "Página não encontrada" };
  const title = `Booking · ${snapshot.profile.displayName}`;
  const description = `Pedido de booking, rider técnico e hospitalidade de ${snapshot.profile.displayName}.`;
  return {
    title,
    description,
    openGraph: { type: "profile", title, description },
    alternates: { canonical: `/p/${snapshot.slug}/booking` },
  };
}

export default async function BookingPage({ params }: Props) {
  const { slug } = await params;
  const snapshot = await loadPublishedSnapshot(slug);
  if (!snapshot || snapshot.templateId !== "02") notFound();
  if (!snapshot.booking.enabled && !snapshotContent(snapshot).rider) notFound();

  return (
    <PageRenderer
      snapshot={snapshot}
      page="booking"
      links={{ home: `/p/${snapshot.slug}`, booking: `/p/${snapshot.slug}/booking` }}
    />
  );
}
