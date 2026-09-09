"use client";

import { useRef, useState } from "react";
import { deleteJson, getJson, patchJson, postJson } from "@/lib/http";
import { SHARED_LINK_WARNING } from "@/lib/press";
import type { AlbumRow, PressCategoryRow } from "./types";

/**
 * "Press kit", inside the page editor.
 *
 * The prototype builds this card in backoffice-v5.js by replacing
 * `#press .section-body`: a warning, one shared-folder link per category with a
 * public switch, albums, and a rider upload. Same structure here.
 *
 * Doc 02: "Aviso explícito: qualquer pessoa com o link deve conseguir aceder aos
 * ficheiros." The wording lives in lib/press.ts so the API and the UI cannot
 * disagree about it.
 */
export function PressCard({
  artistId,
  categories,
  albums,
  onCategoriesChanged,
  onAlbumsChanged,
  onUploaded,
}: {
  artistId: string;
  categories: PressCategoryRow[];
  albums: AlbumRow[];
  onCategoriesChanged: (rows: PressCategoryRow[]) => void;
  onAlbumsChanged: (rows: AlbumRow[]) => void;
  onUploaded: () => void;
}) {
  const [album, setAlbum] = useState({ name: "", category: categories[0]?.id ?? "press-photos" });
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ text: string; bad?: boolean } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function reloadCategories() {
    const result = await getJson<{ categories: PressCategoryRow[] }>(`/api/artists/${artistId}/press-links`);
    if (result.ok && result.data) onCategoriesChanged(result.data.categories);
  }

  async function reloadAlbums() {
    const result = await getJson<{ albums: AlbumRow[] }>(`/api/artists/${artistId}/albums`);
    if (result.ok && result.data) onAlbumsChanged(result.data.albums);
  }

  function patchCategory(id: string, patch: Partial<PressCategoryRow>) {
    onCategoriesChanged(categories.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  async function saveCategory(row: PressCategoryRow) {
    if (busy) return;
    setBusy(true);
    const result = await postJson(`/api/artists/${artistId}/press-links`, {
      category: row.id,
      url: row.url,
      isPublic: row.isPublic,
    });
    setStatus(result.ok ? { text: `${row.label} guardado.` } : { text: result.error ?? "Erro.", bad: true });
    await reloadCategories();
    setBusy(false);
  }

  async function createAlbum() {
    if (busy || !album.name.trim()) return;
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
    if (!result.ok) setStatus({ text: result.error ?? "Erro.", bad: true });
    await reloadAlbums();
    setBusy(false);
  }

  async function removeAlbum(row: AlbumRow) {
    if (busy) return;
    setBusy(true);
    const result = await deleteJson(`/api/albums/${row.id}`);
    if (!result.ok) setStatus({ text: result.error ?? "Erro.", bad: true });
    await reloadAlbums();
    setBusy(false);
  }

  async function upload(event: React.ChangeEvent<HTMLInputElement>, albumId?: string) {
    const file = event.target.files?.[0];
    if (!file || busy) return;
    setBusy(true);
    setStatus({ text: `A enviar ${file.name}…` });

    const form = new FormData();
    form.append("file", file);
    form.append("title", file.name);
    if (albumId) form.append("albumId", albumId);

    const result = await postJson(`/api/artists/${artistId}/media`, form);
    setStatus(
      result.ok
        ? { text: `${file.name} guardado. O original fica preservado e a página usa um derivado leve.` }
        : { text: result.error ?? "Não foi possível enviar.", bad: true },
    );
    if (fileInput.current) fileInput.current.value = "";
    await reloadAlbums();
    onUploaded();
    setBusy(false);
  }

  return (
    <>
      <div className="notice">
        <span className="warning-icon" aria-hidden="true">
          ⚠
        </span>
        <p>{SHARED_LINK_WARNING} Os ficheiros e álbuns só ficam públicos quando os marcares como tal.</p>
      </div>

      <h3>Categorias e links partilhados</h3>
      <div className="press-links">
        {categories.map((row) => (
          <div className="fields" key={row.id}>
            <label className="field">
              {row.label} · Link (Google Drive ou outro)
              <input
                type="url"
                placeholder="https://drive.google.com/…"
                value={row.url}
                onChange={(e) => patchCategory(row.id, { url: e.target.value })}
                onBlur={() => saveCategory(row)}
              />
              {row.isDocument && <small>Documento: o visitante abre ou descarrega diretamente.</small>}
            </label>
            <label className="field">
              Disponibilizar no press kit
              <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input
                  type="checkbox"
                  checked={row.isPublic}
                  onChange={(e) => {
                    patchCategory(row.id, { isPublic: e.target.checked });
                    saveCategory({ ...row, isPublic: e.target.checked });
                  }}
                />
                {row.isPublic ? "Visível no press kit" : "Oculto"}
              </span>
            </label>
          </div>
        ))}
      </div>

      <h3>Álbuns e ficheiros</h3>
      <div className="manager-form">
        <div className="fields">
          <label className="field">
            Nome do álbum
            <input type="text" value={album.name} onChange={(e) => setAlbum({ ...album, name: e.target.value })} />
          </label>
          <label className="field">
            Categoria
            <select value={album.category} onChange={(e) => setAlbum({ ...album, category: e.target.value })}>
              {categories.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button type="button" className="secondary" onClick={createAlbum} disabled={busy}>
          ＋ Criar álbum
        </button>
      </div>

      {albums.length === 0 ? (
        <div className="empty-library">Ainda não há álbuns.</div>
      ) : (
        albums.map((row) => (
          <div className="repeat-item" key={row.id}>
            <div className="album-header">
              <div>
                <b>{row.name}</b>
                <small style={{ display: "block", color: "var(--muted)" }}>
                  {row.mediaCount} ficheiros · {row.isPublic ? "público" : "privado"}
                </small>
              </div>
              <div className="record-actions">
                <button type="button" className="secondary" onClick={() => toggleAlbum(row)} disabled={busy}>
                  {row.isPublic ? "Tornar privado" : "Tornar público"}
                </button>
                <button type="button" className="quiet" onClick={() => removeAlbum(row)} disabled={busy}>
                  Remover
                </button>
              </div>
            </div>
            <label className="field">
              Adicionar ficheiro a este álbum
              <input type="file" onChange={(event) => upload(event, row.id)} disabled={busy} />
            </label>
          </div>
        ))
      )}

      <label className="upload field">
        Fotografias, logos, riders e PDFs
        <input ref={fileInput} type="file" onChange={(event) => upload(event)} disabled={busy} />
        <small>
          O original em alta qualidade é preservado; a página usa um derivado leve. Ficheiros privados não são
          acessíveis por URL adivinhável.
        </small>
      </label>

      {status && (
        <p className="hint" role="status" style={status.bad ? { color: "var(--danger)" } : undefined}>
          {status.text}
        </p>
      )}
    </>
  );
}
