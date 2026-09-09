"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

/**
 * Artists listing with search — the prototype's artists.html behaviour.
 *
 * Doc 01: "Deve existir uma listagem de artistas que trabalham com Muska/My Page,
 * alimentada pelo catálogo real, com pesquisa, imagens e paginação. A página
 * local atual contém apenas uma seleção demonstrativa, não o catálogo completo."
 *
 * So the grid now carries two kinds of row and says which is which: pages
 * published on My Page, which are real data this app owns, and the handoff's
 * demonstration selection of Muska profiles, which is still a hand-picked list.
 * The full catalogue stays behind the Muska link until the adapter exists.
 */

export interface ArtistCard {
  key: string;
  name: string;
  description: string;
  href: string;
  external: boolean;
  initials: string;
  imageUrl: string | null;
  badge: string;
  cta: string;
  variant?: "second";
}

function normalise(value: string): string {
  return [...value.normalize("NFD")]
    .filter((char) => {
      const code = char.codePointAt(0) ?? 0;
      return code < 0x0300 || code > 0x036f;
    })
    .join("")
    .toLowerCase();
}

export function ArtistGrid({ artists }: { artists: ArtistCard[] }) {
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const needle = normalise(query.trim());
    if (!needle) return artists;
    return artists.filter((artist) => normalise(artist.name).includes(needle));
  }, [artists, query]);

  return (
    <>
      <div className="ar-toolbar">
        <label className="ar-search">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            aria-label="Pesquisar artistas por nome"
            placeholder="Pesquisar artista…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <span className="ar-count" role="status">
          {visible.length} {visible.length === 1 ? "artista" : "artistas"} nesta seleção
        </span>
      </div>

      <p className="ar-note">
        Páginas publicadas no My Page mais uma seleção inicial de perfis públicos Muska. O catálogo completo e as
        fotografias ainda não estão sincronizados.
      </p>

      <section className="ar-grid" aria-label="Artistas">
        {visible.map((artist) =>
          artist.external ? (
            <a className="ar-card" key={artist.key} href={artist.href} target="_blank" rel="noopener noreferrer">
              <Portrait artist={artist} />
              <Copy artist={artist} />
            </a>
          ) : (
            <Link className="ar-card" key={artist.key} href={artist.href}>
              <Portrait artist={artist} />
              <Copy artist={artist} />
            </Link>
          ),
        )}

        <aside className="ar-explore">
          <div>
            <span className="ar-eyebrow">MAIS ARTISTAS</span>
            <h2>Continua a explorar.</h2>
            <p>Consulta todos os artistas diretamente no catálogo Muska Live.</p>
          </div>
          {/* Doc 01: "'Explorar artistas' deve abrir https://muskalive.com". */}
          <a className="ar-button" href="https://muskalive.com" target="_blank" rel="noopener noreferrer">
            Ver catálogo Muska ↗
          </a>
        </aside>
      </section>

      {visible.length === 0 && (
        <p className="ar-empty">Não encontrámos esse nome nesta seleção. Consulta o catálogo completo no Muska.</p>
      )}
    </>
  );
}

function Portrait({ artist }: { artist: ArtistCard }) {
  return (
    <div className={`ar-portrait ${artist.variant ?? ""}`}>
      {artist.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={artist.imageUrl} alt="" />
      ) : (
        <span aria-hidden="true">{artist.initials}</span>
      )}
      <small>{artist.badge}</small>
    </div>
  );
}

function Copy({ artist }: { artist: ArtistCard }) {
  return (
    <div className="ar-copy">
      <h2>{artist.name}</h2>
      <p>{artist.description}</p>
      <b>{artist.cta}</b>
    </div>
  );
}
