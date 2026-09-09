import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import type { PageSnapshot } from "@/lib/page-model";
import { PageRenderer } from "@/templates/PageRenderer";
import "@/styles/templates.css";

/**
 * The public artist page.
 *
 * Doc 03: "O front público nunca deve ler diretamente o armazenamento do
 * browser do artista. Preview lê rascunho autorizado; público lê exclusivamente
 * a versão publicada."
 *
 * This route reads PublishedPage and nothing else. There is no code path from
 * here to PageDraft, which is what makes doc 04's criterion verifiable:
 * "público só muda depois de publicar".
 */

interface Props {
  params: Promise<{ slug: string }>;
}

async function loadSnapshot(slug: string): Promise<PageSnapshot | null> {
  const published = await db.publishedPage.findFirst({
    where: { slug: slug.toLowerCase(), isLive: true },
    select: { snapshot: true },
  });
  if (!published) return null;
  try {
    return JSON.parse(published.snapshot) as PageSnapshot;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const snapshot = await loadSnapshot(slug);
  if (!snapshot) return { title: "Página não encontrada" };

  const title = snapshot.profile.displayName;
  const description =
    snapshot.profile.tagline ??
    snapshot.profile.bio?.slice(0, 160) ??
    `${title} no My Page, powered by Muska.`;
  const image = snapshot.images.hero?.url ?? snapshot.images.portrait?.url;

  return {
    title,
    description,
    openGraph: {
      type: "profile",
      title,
      description,
      images: image ? [{ url: image }] : undefined,
    },
    twitter: { card: "summary_large_image", title, description },
    alternates: { canonical: `/p/${snapshot.slug}` },
  };
}

export default async function PublicPage({ params }: Props) {
  const { slug } = await params;
  const snapshot = await loadSnapshot(slug);
  if (!snapshot) notFound();

  return (
    <>
      {/*
        Structured data from the published snapshot only — the same rule that
        governs the rendered HTML.
      */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "MusicGroup",
            name: snapshot.profile.displayName,
            description: snapshot.profile.tagline ?? undefined,
            genre: snapshot.profile.genres,
            address: snapshot.profile.city
              ? {
                  "@type": "PostalAddress",
                  addressLocality: snapshot.profile.city,
                  addressCountry: snapshot.profile.country ?? undefined,
                }
              : undefined,
            sameAs: snapshot.links.map((link) => link.url),
            event: snapshot.events.map((event) => ({
              "@type": "MusicEvent",
              name: event.title,
              startDate: event.startsAt,
              location: event.venue
                ? { "@type": "Place", name: event.venue, address: event.city ?? undefined }
                : undefined,
            })),
          }),
        }}
      />
      <PageRenderer snapshot={snapshot} />
    </>
  );
}
