"use client";

import { useRef, useState } from "react";
import { deleteJson, getJson, patchJson, postJson } from "@/lib/http";
import { DismissibleNotice } from "./DismissibleNotice";

/**
 * Media library, shared by Áudio, Vídeos and the press kit.
 *
 * Doc 02: "Também receber ficheiros no sistema: originais em alta qualidade
 * preservados, derivados leves para exibição, download autorizado do original e
 * seleção para banner/retrato. Visibilidade por álbum e ficheiro; ficheiro
 * privado não pode ser acessível publicamente por URL previsível."
 *
 * Both halves of that live on the server: /api/media/{id}/view serves the
 * derivative, /download serves the original, and both check ownership. This
 * screen only drives them — it never links to a storage path.
 *
 * Doc 02: "Página escolhe conteúdos da biblioteca; uploads e gestão ficam em
 * Áudio." Selection therefore does not happen here.
 */

export interface MediaRow {
  id: string;
  title: string;
  kind: string;
  mimeType: string;
  sizeBytes: number | null;
  derivedBytes: number | null;
  isPublic: boolean;
  platform: string | null;
  externalUrl: string | null;
  hasOriginal: boolean;
  viewUrl: string;
  downloadUrl: string | null;
  createdAt: string;
}

interface Props {
  artistId: string;
  kind: "audio" | "video" | "image";
  title: string;
  intro: string;
  initialItems: MediaRow[];
  /** Doc 02: link uploads are only meaningful for audio and video. */
  allowLinks?: boolean;
  /** Rendered above the list; used by Áudio for the Muska search. */
  children?: React.ReactNode;
  usage: { used: number; limitMb: number; items: number; maxItems: number };
}

export function MediaLibrary({
  artistId,
  kind,
  title,
  intro,
  initialItems,
  allowLinks = false,
  children,
  usage,
}: Props) {
  const [items, setItems] = useState(initialItems);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ text: string; bad?: boolean } | null>(null);
  const [link, setLink] = useState({ title: "", url: "" });
  const fileInput = useRef<HTMLInputElement>(null);

  async function reload() {
    const result = await getJson<{ items: MediaRow[] }>(`/api/artists/${artistId}/media?kind=${kind}`);
    if (result.ok && result.data) setItems(result.data.items);
  }

  async function upload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || busy) return;

    setBusy(true);
    setStatus({ text: `A enviar ${file.name}…` });

    const form = new FormData();
    form.append("file", file);
    form.append("title", file.name);

    const result = await postJson(`/api/artists/${artistId}/media`, form);
    setStatus(
      result.ok
        ? { text: `${file.name} guardado. O original fica preservado; a exibição usa um derivado leve.` }
        : { text: result.error ?? "Não foi possível enviar.", bad: true },
    );
    if (fileInput.current) fileInput.current.value = "";
    await reload();
    setBusy(false);
  }

  async function addLink(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);

    const result = await postJson(`/api/artists/${artistId}/media`, {
      title: link.title,
      url: link.url,
      kind,
    });
    setStatus(
      result.ok ? { text: "Link adicionado." } : { text: result.error ?? "Link recusado.", bad: true },
    );
    if (result.ok) setLink({ title: "", url: "" });
    await reload();
    setBusy(false);
  }

  async function togglePublic(row: MediaRow) {
    if (busy) return;
    setBusy(true);
    const result = await patchJson(`/api/media/${row.id}`, { isPublic: !row.isPublic });
    setStatus(
      result.ok
        ? { text: `"${row.title}" ficou ${row.isPublic ? "privado" : "público"}.` }
        : { text: result.error ?? "Erro.", bad: true },
    );
    await reload();
    setBusy(false);
  }

  async function remove(row: MediaRow) {
    if (busy) return;
    setBusy(true);
    const result = await deleteJson(`/api/media/${row.id}`);
    setStatus(result.ok ? { text: `"${row.title}" removido.` } : { text: result.error ?? "Erro.", bad: true });
    await reload();
    setBusy(false);
  }

  return (
    <div className="manager">
      <DismissibleNotice id={`library-${kind}`}>
        Ficheiros privados não são acessíveis por URL adivinhável: o servidor verifica a sessão antes de servir
        qualquer original. Torna público apenas o que deve aparecer na página.
      </DismissibleNotice>

      <div className="view-head">
        <div>
          <h2>{title}</h2>
          <p>{intro}</p>
        </div>
        <span className="badge">
          {usage.items}/{usage.maxItems} ficheiros · {usage.used} de {usage.limitMb} MB
        </span>
      </div>

      {children}

      <div className="manager-form">
        <h3>Carregar ficheiro</h3>
        <label className="field">
          Escolher do computador
          <input ref={fileInput} type="file" onChange={upload} disabled={busy} />
          <small>O original é preservado. Para imagens é criado um derivado otimizado para a página.</small>
        </label>
      </div>

      {allowLinks && (
        <form className="manager-form" onSubmit={addLink}>
          <h3>Adicionar por link</h3>
          <div className="fields">
            <label className="field">
              Título
              <input
                type="text"
                value={link.title}
                onChange={(event) => setLink({ ...link, title: event.target.value })}
                required
              />
            </label>
            <label className="field">
              Link
              <input
                type="url"
                placeholder="https://"
                value={link.url}
                onChange={(event) => setLink({ ...link, url: event.target.value })}
                required
              />
              <small>
                {kind === "video"
                  ? "Vídeos aceitam YouTube e Vimeo, que permitem incorporação."
                  : "Spotify, SoundCloud, Mixcloud, Deezer, Bandcamp e outras plataformas suportadas."}
              </small>
            </label>
          </div>
          <button type="submit" className="secondary" disabled={busy}>
            Adicionar link
          </button>
        </form>
      )}

      {status && (
        <p className="hint" role="status" style={status.bad ? { color: "var(--danger)" } : undefined}>
          {status.text}
        </p>
      )}

      {items.length === 0 ? (
        <div className="empty-library">Ainda não há nada nesta biblioteca.</div>
      ) : (
        <div className="library-grid">
          {items.map((row) => (
            <article className="library-item" key={row.id}>
              {row.kind === "image" && row.hasOriginal && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={row.viewUrl} alt={row.title} />
              )}
              <h4>{row.title}</h4>
              <small>{row.externalUrl ? `Link · ${row.platform ?? "externo"}` : formatBytes(row.sizeBytes)}</small>
              <small>{row.isPublic ? "Público" : "Privado"}</small>
              <div className="record-actions">
                <button type="button" className="secondary" onClick={() => togglePublic(row)} disabled={busy}>
                  {row.isPublic ? "Tornar privado" : "Tornar público"}
                </button>
                {row.downloadUrl && (
                  <a className="secondary" href={row.downloadUrl}>
                    Original
                  </a>
                )}
                {row.externalUrl && (
                  <a className="secondary" href={row.externalUrl} target="_blank" rel="noopener noreferrer">
                    Abrir ↗
                  </a>
                )}
                <button type="button" className="quiet" onClick={() => remove(row)} disabled={busy}>
                  Remover
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
