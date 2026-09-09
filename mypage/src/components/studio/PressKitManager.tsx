"use client";

import { useState } from "react";
import { deleteJson, getJson, patchJson, postJson } from "@/lib/http";
import { SHARED_LINK_WARNING } from "@/lib/press";
import { DismissibleNotice } from "./DismissibleNotice";
import { MediaLibrary, type MediaRow } from "./MediaLibrary";

/**
 * Press kit.
 *
 * Doc 02: "Cada categoria pode ter link Google Drive/outro e opção pública.
 * Aviso explícito: qualquer pessoa com o link deve conseguir aceder aos
 * ficheiros. Não exigir integração Google Drive para aceitar links."
 *
 * So a category can be served by a shared folder, by files in the library, or
 * by both — and making a link public always shows the warning verbatim from
 * lib/press.ts, which is the single place that wording lives.
 */

export interface PressCategoryRow {
  id: string;
  label: string;
  isDocument: boolean;
  url: string;
  isPublic: boolean;
}

export interface AlbumRow {
  id: string;
  name: string;
  category: string;
  isPublic: boolean;
  mediaCount: number;
}

interface Props {
  artistId: string;
  initialCategories: PressCategoryRow[];
  initialAlbums: AlbumRow[];
  images: MediaRow[];
  usage: { used: number; limitMb: number; items: number; maxItems: number };
}

export function PressKitManager({ artistId, initialCategories, initialAlbums, images, usage }: Props) {
  const [categories, setCategories] = useState(initialCategories);
  const [albums, setAlbums] = useState(initialAlbums);
  const [album, setAlbum] = useState({ name: "", category: initialCategories[0]?.id ?? "press-photos" });
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ text: string; bad?: boolean } | null>(null);

  async function reloadCategories() {
    const result = await getJson<{ categories: PressCategoryRow[] }>(`/api/artists/${artistId}/press-links`);
    if (result.ok && result.data) setCategories(result.data.categories);
  }

  async function reloadAlbums() {
    const result = await getJson<{ albums: AlbumRow[] }>(`/api/artists/${artistId}/albums`);
    if (result.ok && result.data) setAlbums(result.data.albums);
  }

  async function saveCategory(row: PressCategoryRow) {
    if (busy) return;
    setBusy(true);
    const result = await postJson(`/api/artists/${artistId}/press-links`, {
      category: row.id,
      url: row.url,
      isPublic: row.isPublic,
    });
    setStatus(
      result.ok
        ? { text: `${row.label} guardado.` }
        : { text: result.error ?? "Não foi possível guardar o link.", bad: true },
    );
    await reloadCategories();
    setBusy(false);
  }

  function patchCategory(id: string, patch: Partial<PressCategoryRow>) {
    setCategories((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  async function createAlbum(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    const result = await postJson(`/api/artists/${artistId}/albums`, {
      name: album.name,
      category: album.category,
      isPublic: false,
    });
    setStatus(result.ok ? { text: "Álbum criado." } : { text: result.error ?? "Erro.", bad: true });
    if (result.ok) setAlbum({ ...album, name: "" });
    await reloadAlbums();
    setBusy(false);
  }

  async function toggleAlbum(row: AlbumRow) {
    if (busy) return;
    setBusy(true);
    const result = await patchJson(`/api/albums/${row.id}`, { isPublic: !row.isPublic });
    setStatus(result.ok ? { text: `${row.name} atualizado.` } : { text: result.error ?? "Erro.", bad: true });
    await reloadAlbums();
    setBusy(false);
  }

  async function removeAlbum(row: AlbumRow) {
    if (busy) return;
    setBusy(true);
    const result = await deleteJson(`/api/albums/${row.id}`);
    setStatus(result.ok ? { text: `${row.name} removido.` } : { text: result.error ?? "Erro.", bad: true });
    await reloadAlbums();
    setBusy(false);
  }

  return (
    <>
      <div className="manager">
        <DismissibleNotice id="press-shared-links">{SHARED_LINK_WARNING}</DismissibleNotice>

        <div className="view-head">
          <div>
            <h2>Press kit</h2>
            <p>Pastas partilhadas, álbuns e ficheiros profissionais. Riders abrem por link ou download.</p>
          </div>
        </div>

        <h3>Categorias e links partilhados</h3>
        <div className="record-grid">
          {categories.map((row) => (
            <article className="record-card" key={row.id}>
              <h4>{row.label}</h4>
              <label className="field">
                Link partilhado
                <input
                  type="url"
                  placeholder="https://drive.google.com/…"
                  value={row.url}
                  onChange={(event) => patchCategory(row.id, { url: event.target.value })}
                />
              </label>
              <label className="field" style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <input
                  type="checkbox"
                  checked={row.isPublic}
                  onChange={(event) => patchCategory(row.id, { isPublic: event.target.checked })}
                />
                Mostrar na página pública
              </label>
              {row.isPublic && <small style={{ color: "var(--warning)" }}>{SHARED_LINK_WARNING}</small>}
              <div className="record-actions">
                <button type="button" className="secondary" onClick={() => saveCategory(row)} disabled={busy}>
                  Guardar
                </button>
                {row.url && (
                  <a className="secondary" href={row.url} target="_blank" rel="noopener noreferrer">
                    Abrir ↗
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>

        <form className="manager-form" onSubmit={createAlbum}>
          <h3>Novo álbum</h3>
          <div className="fields">
            <label className="field">
              Nome
              <input
                type="text"
                value={album.name}
                onChange={(event) => setAlbum({ ...album, name: event.target.value })}
                required
              />
            </label>
            <label className="field">
              Categoria
              <select value={album.category} onChange={(event) => setAlbum({ ...album, category: event.target.value })}>
                {categories.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button type="submit" className="primary" disabled={busy}>
            Criar álbum
          </button>
          {status && (
            <p className="hint" role="status" style={status.bad ? { color: "var(--danger)" } : undefined}>
              {status.text}
            </p>
          )}
        </form>

        <h3>Álbuns</h3>
        {albums.length === 0 ? (
          <div className="empty-library">Ainda não há álbuns.</div>
        ) : (
          <ul className="activity-list">
            {albums.map((row) => (
              <li key={row.id}>
                {row.name}
                <small>
                  {row.mediaCount} ficheiros · {row.isPublic ? "público" : "privado"} ·{" "}
                  <button type="button" className="quiet" onClick={() => toggleAlbum(row)} disabled={busy}>
                    {row.isPublic ? "Tornar privado" : "Tornar público"}
                  </button>
                  <button type="button" className="quiet" onClick={() => removeAlbum(row)} disabled={busy}>
                    Remover
                  </button>
                </small>
              </li>
            ))}
          </ul>
        )}
      </div>

      <MediaLibrary
        artistId={artistId}
        kind="image"
        title="Imagens e documentos"
        intro="Os originais ficam preservados; a página usa derivados leves. As mesmas imagens servem o banner e o retrato, sem novo upload."
        initialItems={images}
        usage={usage}
      />
    </>
  );
}
