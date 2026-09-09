"use client";

import { useState } from "react";
import { deleteJson, getJson, patchJson, postJson } from "@/lib/http";
import type { EditorProfile, LinkRow, PlatformOption } from "./types";

/**
 * "Informações básicas".
 *
 * Doc 01: "Informações básicas foi aprovada e deve ser preservada." The field
 * list and their order are the prototype's, including the private real name and
 * the live address preview.
 *
 * Doc 02: the social/platform list lives in this card, as `repeat-list` did in
 * the prototype. Placement ("no hero, só na secção, ou ambos") comes from doc 02:
 * "Link pode aparecer no hero, só na secção de música ou em ambos."
 */
export function BasicCard({
  artistId,
  profile,
  domain,
  links,
  platforms,
  onChange,
  onLinksChanged,
}: {
  artistId: string;
  profile: EditorProfile;
  domain: string;
  links: LinkRow[];
  platforms: PlatformOption[];
  onChange: (patch: Partial<EditorProfile>) => void;
  onLinksChanged: (links: LinkRow[]) => void;
}) {
  const [draft, setDraft] = useState({ url: "", label: "", platform: platforms[0]?.id ?? "", group: "social", placement: "section" });
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ text: string; bad?: boolean } | null>(null);

  async function reload() {
    const result = await getJson<{ links: LinkRow[] }>(`/api/artists/${artistId}/links`);
    if (result.ok && result.data) onLinksChanged(result.data.links);
  }

  async function addLink() {
    if (busy) return;
    setBusy(true);
    setStatus(null);
    const result = await postJson(`/api/artists/${artistId}/links`, {
      url: draft.url,
      label: draft.label || null,
      platform: draft.platform,
      group: draft.group,
      placement: draft.placement,
    });
    setStatus(result.ok ? { text: "Link adicionado." } : { text: result.error ?? "Erro.", bad: true });
    if (result.ok) setDraft({ ...draft, url: "", label: "" });
    await reload();
    setBusy(false);
  }

  async function updatePlacement(link: LinkRow, placement: string) {
    if (busy) return;
    setBusy(true);
    const result = await patchJson(`/api/links/${link.id}`, { placement });
    if (!result.ok) setStatus({ text: result.error ?? "Erro.", bad: true });
    await reload();
    setBusy(false);
  }

  async function removeLink(link: LinkRow) {
    if (busy) return;
    setBusy(true);
    const result = await deleteJson(`/api/links/${link.id}`);
    if (!result.ok) setStatus({ text: result.error ?? "Erro.", bad: true });
    await reload();
    setBusy(false);
  }

  return (
    <>
      <div className="fields">
        <label className="field">
          Nome real · privado
          <input type="text" value={profile.realName} onChange={(e) => onChange({ realName: e.target.value })} />
          <small>Nunca aparece na página pública.</small>
        </label>

        <label className="field">
          Nome artístico
          <input
            type="text"
            value={profile.displayName}
            onChange={(e) => onChange({ displayName: e.target.value })}
            required
          />
        </label>

        <label className="field">
          Endereço pretendido
          <input
            type="text"
            value={profile.slug}
            spellCheck={false}
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            onChange={(e) => onChange({ slug: e.target.value.toLowerCase() })}
          />
        </label>

        <div className="field">
          <span>Endereço da página</span>
          <div className="address">
            {domain}/p/{profile.slug || "…"}
          </div>
          <small>
            Doc 01: o domínio e o formato final ainda têm de ser confirmados com o proprietário. O endereço ainda não
            está registado.
          </small>
        </div>

        <label className="field">
          Cidade
          <input type="text" value={profile.city} onChange={(e) => onChange({ city: e.target.value })} />
        </label>

        <label className="field">
          País
          <input type="text" value={profile.country} onChange={(e) => onChange({ country: e.target.value })} />
        </label>

        <label className="field">
          Géneros musicais
          <input
            type="text"
            placeholder="Afro House, Amapiano…"
            value={profile.genres}
            onChange={(e) => onChange({ genres: e.target.value })}
          />
        </label>

        <label className="field">
          Frase de apresentação
          <input type="text" value={profile.tagline} onChange={(e) => onChange({ tagline: e.target.value })} />
        </label>

        <label className="field wide">
          Biografia
          <textarea rows={5} value={profile.bio} onChange={(e) => onChange({ bio: e.target.value })} />
        </label>

        <label className="field">
          Email de contacto · privado
          <input type="email" value={profile.contactEmail} onChange={(e) => onChange({ contactEmail: e.target.value })} />
        </label>

        <label className="field">
          Telefone · privado
          <input type="tel" value={profile.contactPhone} onChange={(e) => onChange({ contactPhone: e.target.value })} />
        </label>
      </div>

      <h3>Redes e plataformas</h3>

      {links.map((link) => (
        <div className="repeat-item" key={link.id}>
          <div className="fields">
            <div className="field">
              <span>Plataforma</span>
              <div className="social-link-row">
                <span className="social-symbol" aria-hidden="true">
                  {link.mark}
                </span>
                <span>
                  {link.platformLabel}
                  {link.embeddable && <span className="badge" style={{ marginLeft: 8 }}>Player disponível</span>}
                </span>
              </div>
            </div>
            <label className="field">
              Onde aparece
              <select
                value={link.placement}
                onChange={(e) => updatePlacement(link, e.target.value)}
                disabled={busy}
              >
                <option value="section">Só na secção</option>
                <option value="hero">Só no hero</option>
                <option value="both">Hero e secção</option>
              </select>
            </label>
            <div className="field wide">
              <span>Link público</span>
              <div className="address">{link.url}</div>
            </div>
          </div>
          <button type="button" className="remove quiet" onClick={() => removeLink(link)} disabled={busy}>
            Remover
          </button>
        </div>
      ))}

      <div className="repeat-item">
        <div className="fields">
          <label className="field">
            Plataforma
            <select value={draft.platform} onChange={(e) => setDraft({ ...draft, platform: e.target.value })}>
              {platforms.map((platform) => (
                <option key={platform.id} value={platform.id}>
                  {platform.label}
                </option>
              ))}
            </select>
            <small>A plataforma é confirmada a partir do endereço; se divergirem, prevalece o endereço.</small>
          </label>
          <label className="field">
            Grupo
            <select value={draft.group} onChange={(e) => setDraft({ ...draft, group: e.target.value })}>
              <option value="social">Redes sociais</option>
              <option value="music">Música</option>
            </select>
          </label>
          <label className="field">
            Onde aparece
            <select value={draft.placement} onChange={(e) => setDraft({ ...draft, placement: e.target.value })}>
              <option value="section">Só na secção</option>
              <option value="hero">Só no hero</option>
              <option value="both">Hero e secção</option>
            </select>
          </label>
          <label className="field">
            Etiqueta · opcional
            <input type="text" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
          </label>
          <label className="field wide">
            Link público
            <input
              type="url"
              placeholder="https://"
              value={draft.url}
              onChange={(e) => setDraft({ ...draft, url: e.target.value })}
            />
          </label>
        </div>
        <button type="button" className="secondary" onClick={addLink} disabled={busy || !draft.url}>
          ＋ Adicionar link
        </button>
      </div>

      {status && (
        <p className="hint" role="status" style={status.bad ? { color: "var(--danger)" } : undefined}>
          {status.text}
        </p>
      )}
    </>
  );
}
