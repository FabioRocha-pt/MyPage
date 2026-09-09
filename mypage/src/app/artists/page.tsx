import type { Metadata } from "next";
import Link from "next/link";
import { ArtistGrid, type ArtistCard } from "@/components/artists/ArtistGrid";
import { db } from "@/lib/db";
import type { PageSnapshot } from "@/lib/page-model";
import "@/styles/artists.css";

export const metadata: Metadata = {
  title: "Artistas",
  description: "Descobre artistas e explora as suas páginas no Muska.",
};

/**
 * The listing reads published pages, so it must not be frozen at build time:
 * a page published after the deploy has to appear without a rebuild.
 */
export const dynamic = "force-dynamic";

/**
 * Artists listing — the prototype's artists.html.
 *
 * The two Muska profiles below are the handoff's demonstration selection, kept
 * with the same names, links and wording. Doc 01 notes they are exactly that:
 * "A página local atual contém apenas uma seleção demonstrativa, não o catálogo
 * completo." Published My Page pages are added from the database, so the page
 * grows into a real listing as artists publish.
 */

const MUSKA_SELECTION: ArtistCard[] = [
  {
    key: "muska-real-d1",
    name: "Real_D1",
    description: "Música, discografia e página do artista",
    href: "https://www.muska.live/en/artists/774f52ff-5448-47da-a01f-863309ab8d80",
    external: true,
    initials: "R1",
    imageUrl: null,
    badge: "PERFIL MUSKA",
    cta: "Abrir página no Muska ↗",
  },
  {
    key: "muska-cleu-sanches",
    name: "Cleu Sanches",
    description: "Biografia, música e vídeos do artista",
    href: "https://www.muska.live/artists/0000e535-633a-4a17-9a96-ceacc7eab922",
    external: true,
    initials: "CS",
    imageUrl: null,
    badge: "PERFIL MUSKA",
    cta: "Abrir página no Muska ↗",
    variant: "second",
  },
];

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0] ?? "")
    .join("")
    .toUpperCase();
}

export default async function ArtistsPage() {
  const published = await db.publishedPage.findMany({
    where: { isLive: true },
    orderBy: { publishedAt: "desc" },
    take: 48,
    select: { slug: true, snapshot: true },
  });

  const pages: ArtistCard[] = published.flatMap((row) => {
    let snapshot: PageSnapshot;
    try {
      snapshot = JSON.parse(row.snapshot) as PageSnapshot;
    } catch {
      return [];
    }
    return [
      {
        key: `page-${row.slug}`,
        name: snapshot.profile.displayName,
        description: snapshot.profile.tagline ?? "Página My Page publicada",
        href: `/p/${row.slug}`,
        external: false,
        initials: initials(snapshot.profile.displayName),
        imageUrl: snapshot.images.portrait?.url ?? snapshot.images.hero?.url ?? null,
        badge: "PÁGINA MY PAGE",
        cta: "Abrir página ↗",
      },
    ];
  });

  return (
    <div className="ar-page">
      <header>
        <nav className="ar-wrap">
          <Link className="ar-brand" href="/">
            My Page
            <small>POWERED BY MUSKA</small>
          </Link>
          <div className="ar-navlinks">
            <Link className="optional" href="/">
              Conhecer My Page
            </Link>
            <Link className="active" href="/artists" aria-current="page">
              Artistas
            </Link>
            <Link className="ar-button" href="/studio">
              O meu espaço ↗
            </Link>
          </div>
        </nav>
      </header>

      <main className="ar-wrap">
        <section className="ar-intro">
          <div>
            <span className="ar-eyebrow">A COMUNIDADE MUSKA</span>
            <h1>
              Encontra o artista.
              <br />
              Descobre o som.
            </h1>
          </div>
          <p>
            Explora as páginas dos artistas, conhece as suas histórias e encontra a música que partilham no Muska.
          </p>
        </section>

        <ArtistGrid artists={[...pages, ...MUSKA_SELECTION]} />

        <section className="ar-free">
          <div>
            <span className="ar-eyebrow">MY PAGE FREE</span>
            <h2>A tua presença começa no Muska.</h2>
            <p>O perfil de artista já existente é o ponto de partida para a experiência My Page Free.</p>
            <a
              className="ar-button primary"
              href="https://www.muska.live/en/artists/7618d975-55ef-4faf-9f16-5d8a0286d0af#biography"
              target="_blank"
              rel="noopener noreferrer"
            >
              Ver exemplo de My Page Free ↗
            </a>
          </div>
          <ul>
            <li>Biografia e ligações</li>
            <li>Músicas em destaque</li>
            <li>Discografia</li>
            <li>Vídeos</li>
            <li>Uma página para partilhar</li>
          </ul>
        </section>
      </main>

      <footer className="ar-wrap">
        <span>My Page · Powered by Muska</span>
        <Link href="/#pricing">Conhecer os planos ↗</Link>
      </footer>
    </div>
  );
}
