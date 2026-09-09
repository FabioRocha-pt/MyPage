"use client";

import { useState } from "react";
import { deleteJson, getJson, patchJson, postJson } from "@/lib/http";
import { DismissibleNotice } from "./DismissibleNotice";

/**
 * External links.
 *
 * Doc 02: "Fluxo desejado: escolher plataforma, colar link, identificar
 * tipo/metadados, mostrar logo oficial e integrar player onde permitido."
 * The server detects the platform from the URL and overrides a wrong choice,
 * so the select below is a hint, not the source of truth.
 *
 * Doc 02: "Link pode aparecer no hero, só na secção de música ou em ambos."
 */

export interface LinkRow {
  id: string;
  platform: string;
  platformLabel: string;
  mark: string;
  label: string | null;
  url: string;
  group: string;
  placement: string;
  embeddable: boolean;
}

export interface PlatformOption {
  id: string;
  label: string;
  mark: string;
  group: string;
}

interface Props {
  artistId: string;
  initialLinks: LinkRow[];
  platforms: PlatformOption[];
}

export function LinksManager({ artistId, initialLinks, platforms }: Props) {
  const [links, setLinks] = useState(initialLinks);
  const [form, setForm] = useState({ url: "", label: "", platform: platforms[0]?.id ?? "", group: "social", placement: "section" });
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ text: string; bad?: boolean } | null>(null);

  async function reload() {
    const result = await getJson<{ links: LinkRow[] }>(`/api/artists/${artistId}/links`);
    if (result.ok && result.data) setLinks(result.data.links);
  }

  async function add(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setStatus(null);

    const result = await postJson(`/api/artists/${artistId}/links`, {
      url: form.url,
      label: form.label || null,
      platform: form.platform,
      group: form.group,
      placement: form.placement,
    });

    setStatus(result.ok ? { text: "Link adicionado." } : { text: result.error ?? "Erro.", bad: true });
    if (result.ok) setForm({ ...form, url: "", label: "" });
    await reload();
    setBusy(false);
  }

  async function setPlacement(row: LinkRow, placement: string) {
    if (busy) return;
    setBusy(true);
    const result = await patchJson(`/api/links/${row.id}`, { placement });
    setStatus(result.ok ? { text: "Posição atualizada." } : { text: result.error ?? "Erro.", bad: true });
    await reload();
    setBusy(false);
  }

  async function remove(row: LinkRow) {
    if (busy) return;
    setBusy(true);
    const result = await deleteJson(`/api/links/${row.id}`);
    setStatus(result.ok ? { text: "Link removido." } : { text: result.error ?? "Erro.", bad: true });
    await reload();
    setBusy(false);
  }

  return (
    <div className="manager">
      <DismissibleNotice id="links-detection">
        A plataforma é detetada a partir do endereço. Se o link não corresponder ao que escolheste, prevalece o que
        o endereço indica — para o logo e o player não ficarem errados.
      </DismissibleNotice>

      <div className="view-head">
        <div>
          <h2>Ligações</h2>
          <p>Redes sociais e plataformas de música. Escolhe onde cada uma aparece na página.</p>
        </div>
      </div>

      <form className="manager-form" onSubmit={add}>
        <h3>Novo link</h3>
        <div className="fields">
          <label className="field">
            Endereço
            <input
              type="url"
              placeholder="https://"
              value={form.url}
              onChange={(event) => setForm({ ...form, url: event.target.value })}
              required
            />
          </label>
          <label className="field">
            Plataforma
            <select value={form.platform} onChange={(event) => setForm({ ...form, platform: event.target.value })}>
              {platforms.map((platform) => (
                <option key={platform.id} value={platform.id}>
                  {platform.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Grupo
            <select value={form.group} onChange={(event) => setForm({ ...form, group: event.target.value })}>
              <option value="social">Redes sociais</option>
              <option value="music">Música</option>
            </select>
          </label>
          <label className="field">
            Onde aparece
            <select value={form.placement} onChange={(event) => setForm({ ...form, placement: event.target.value })}>
              <option value="section">Só na secção</option>
              <option value="hero">Só no hero</option>
              <option value="both">Hero e secção</option>
            </select>
          </label>
          <label className="field wide">
            Etiqueta · opcional
            <input
              type="text"
              value={form.label}
              onChange={(event) => setForm({ ...form, label: event.target.value })}
            />
          </label>
        </div>
        <button type="submit" className="primary" disabled={busy}>
          Adicionar link
        </button>
        {status && (
          <p className="hint" role="status" style={status.bad ? { color: "var(--danger)" } : undefined}>
            {status.text}
          </p>
        )}
      </form>

      <h3>Links</h3>
      {links.length === 0 ? (
        <div className="empty-library">Ainda não há links.</div>
      ) : (
        <ul className="activity-list">
          {links.map((row) => (
            <li key={row.id}>
              <span className="social-symbol" aria-hidden="true" style={{ marginRight: 10 }}>
                {row.mark}
              </span>
              {row.platformLabel}
              {row.label ? ` · ${row.label}` : ""}
              {row.embeddable && <span className="badge" style={{ marginLeft: 8 }}>Player disponível</span>}
              <small>
                {row.url}
                {" · "}
                <select
                  value={row.placement}
                  onChange={(event) => setPlacement(row, event.target.value)}
                  disabled={busy}
                  aria-label={`Posição de ${row.platformLabel}`}
                >
                  <option value="section">Só na secção</option>
                  <option value="hero">Só no hero</option>
                  <option value="both">Hero e secção</option>
                </select>
                {" · "}
                <button type="button" className="quiet" onClick={() => remove(row)} disabled={busy}>
                  Remover
                </button>
              </small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
