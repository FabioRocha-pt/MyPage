"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { evaluatePalette, normaliseHex, textOn } from "@/lib/colors";
import {
  EDITOR_CARDS,
  sectionMeta,
  type EditorCardId,
  type Section,
  type SectionId,
} from "@/lib/page-model";
import type { Entitlement } from "@/lib/entitlements";
import { TEMPLATES } from "@/templates/registry";
import { DismissibleNotice } from "./DismissibleNotice";

/**
 * The page editor.
 *
 * Doc 01: "Em Page, ordenar no próprio cartão, sem uma segunda secção 'Ordem da
 * página'." The arrows and the visibility switch live in each accordion header;
 * there is no separate ordering list.
 *
 * Doc 02: "Separar no modelo definitivo `editorOrder` de `sectionOrder`."
 * Moving a card reorders the editor list, and — when that card also feeds a
 * public section — the public order with it. `visual` is configuration and has
 * neither arrows nor a visibility switch, because it renders nothing publicly.
 *
 * Doc 01: "Atualizar página, Preview e Publicar no fundo. (…) Não confundir
 * guardar com publicar." Saving never touches the published page; publishing is
 * a separate, explicit action.
 */

export interface EditorProfile {
  displayName: string;
  slug: string;
  tagline: string;
  bio: string;
  city: string;
  country: string;
  genres: string;
  realName: string;
  contactEmail: string;
  contactPhone: string;
}

export interface EditorAppearance {
  templateId: string;
  themeMode: "dark" | "light" | "system";
  background: string;
  textColor: string;
  accent: string;
  heroMediaId: string | null;
  portraitMediaId: string | null;
  logoMediaId: string | null;
}

export interface ImageOption {
  id: string;
  title: string;
  viewUrl: string;
}

export interface LinkRow {
  id: string;
  platformLabel: string;
  mark: string;
  label: string | null;
  url: string;
  group: string;
  placement: string;
}

export interface PageEditorProps {
  artistId: string;
  domain: string;
  entitlement: Entitlement;
  initialProfile: EditorProfile;
  initialAppearance: EditorAppearance;
  initialEditorOrder: EditorCardId[];
  initialSections: Section[];
  initialVersion: number;
  images: ImageOption[];
  links: LinkRow[];
  publishedVersion: number | null;
}

/** Which public section a card controls; `null` means configuration only. */
const CARD_SECTION: Record<EditorCardId, SectionId | null> = {
  basic: "biography",
  visual: null,
  press: "press",
  music: "music",
  video: "video",
  events: "events",
  booking: "booking",
  donations: "donations",
  store: "store",
};

/** Where the artist manages the content each section selects from. */
const CARD_MANAGER: Partial<Record<EditorCardId, { href: string; label: string }>> = {
  press: { href: "/studio/press", label: "Abrir press kit" },
  music: { href: "/studio/audio", label: "Abrir biblioteca de áudio" },
  video: { href: "/studio/video", label: "Abrir biblioteca de vídeo" },
  events: { href: "/studio/events", label: "Abrir gestão de eventos" },
  booking: { href: "/studio/booking", label: "Abrir disponibilidade e pedidos" },
  donations: { href: "/studio/donations", label: "Abrir campanhas" },
  store: { href: "/studio/store", label: "Abrir loja" },
};

const CARD_TOOL: Partial<Record<EditorCardId, string>> = {
  press: "press",
  music: "music",
  video: "video",
  events: "events",
  booking: "booking",
  donations: "donations",
  store: "store",
};

type Status = { text: string; tone: "" | "ok" | "error" } | null;

export function PageEditor(props: PageEditorProps) {
  const [profile, setProfile] = useState(props.initialProfile);
  const [appearance, setAppearance] = useState(props.initialAppearance);
  const [editorOrder, setEditorOrder] = useState(props.initialEditorOrder);
  const [sections, setSections] = useState(props.initialSections);
  const [version, setVersion] = useState(props.initialVersion);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<"" | "save" | "publish">("");
  const [status, setStatus] = useState<Status>(null);
  const [open, setOpen] = useState<EditorCardId | null>("basic");

  const palette = useMemo(
    () =>
      evaluatePalette({
        background: appearance.background,
        text: appearance.textColor,
        accent: appearance.accent,
      }),
    [appearance.background, appearance.textColor, appearance.accent],
  );

  const sectionById = useMemo(() => new Map(sections.map((s) => [s.id, s])), [sections]);

  function patchProfile(patch: Partial<EditorProfile>) {
    setProfile((current) => ({ ...current, ...patch }));
    setDirty(true);
  }

  function patchAppearance(patch: Partial<EditorAppearance>) {
    setAppearance((current) => ({ ...current, ...patch }));
    setDirty(true);
  }

  /**
   * Moves a card and, when it maps to a public section, the section with it.
   * Pinned sections (the hero) never move, so the public order cannot put the
   * hero below the fold.
   */
  function move(cardId: EditorCardId, direction: -1 | 1) {
    setEditorOrder((current) => {
      const index = current.indexOf(cardId);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

    const sectionId = CARD_SECTION[cardId];
    if (sectionId) {
      setSections((current) => {
        const movable = current.filter((s) => !sectionMeta(s.id).pinned);
        const pinned = current.filter((s) => sectionMeta(s.id).pinned);
        const index = movable.findIndex((s) => s.id === sectionId);
        const target = index + direction;
        if (index < 0 || target < 0 || target >= movable.length) return current;
        const next = [...movable];
        [next[index], next[target]] = [next[target], next[index]];
        return [...pinned, ...next].map((section, position) => ({ ...section, position }));
      });
    }
    setDirty(true);
  }

  function toggleSection(sectionId: SectionId) {
    setSections((current) =>
      current.map((section) =>
        section.id === sectionId ? { ...section, enabled: !section.enabled } : section,
      ),
    );
    setDirty(true);
  }

  async function save() {
    if (busy) return;
    setBusy("save");
    setStatus(null);

    try {
      const response = await fetch(`/api/artists/${props.artistId}/page/draft`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version,
          artist: {
            displayName: profile.displayName,
            slug: profile.slug,
            tagline: profile.tagline || null,
            bio: profile.bio || null,
            city: profile.city || null,
            country: profile.country || null,
            genres: profile.genres || null,
            realName: profile.realName || null,
            contactEmail: profile.contactEmail || null,
            contactPhone: profile.contactPhone || null,
          },
          draft: {
            ...appearance,
            editorOrder,
            sections,
          },
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setStatus({ text: payload?.error?.message ?? "Não foi possível guardar.", tone: "error" });
        return;
      }
      setVersion(payload.version);
      setDirty(false);
      setStatus({
        text: "Rascunho guardado. A página pública só muda depois de publicares.",
        tone: "ok",
      });
    } catch {
      setStatus({ text: "Sem ligação ao servidor. O rascunho não foi guardado.", tone: "error" });
    } finally {
      setBusy("");
    }
  }

  async function publish() {
    if (busy) return;
    if (dirty) {
      setStatus({ text: "Guarda o rascunho antes de publicar.", tone: "error" });
      return;
    }
    setBusy("publish");
    setStatus(null);

    try {
      const response = await fetch(`/api/artists/${props.artistId}/page/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const payload = await response.json();
      if (!response.ok) {
        const errors: string[] = payload?.error?.details?.errors ?? [];
        setStatus({
          text: errors.length
            ? `${payload.error.message} ${errors.join(" · ")}`
            : (payload?.error?.message ?? "Não foi possível publicar."),
          tone: "error",
        });
        return;
      }
      const warnings: string[] = payload.warnings ?? [];
      setStatus({
        text: `Publicado (versão ${payload.version}) em ${payload.url}.${
          warnings.length ? ` Avisos: ${warnings.join(" · ")}` : ""
        }`,
        tone: "ok",
      });
    } catch {
      setStatus({ text: "Sem ligação ao servidor. Nada foi publicado.", tone: "error" });
    } finally {
      setBusy("");
    }
  }

  const movableCards = editorOrder.length;

  return (
    <>
      <DismissibleNotice id="page-editor-draft">
        Tudo o que mudares aqui fica no rascunho. A página pública só muda quando carregares em Publicar.
      </DismissibleNotice>

      <div className="view-head">
        <div>
          <h2>Faz dela a tua página.</h2>
          <p>Abre uma secção para editar o conteúdo que vai aparecer no site.</p>
        </div>
        <span className={`badge ${dirty ? "is-draft" : ""}`}>
          {dirty ? "Alterações por guardar" : `Rascunho v${version}`}
        </span>
      </div>

      {editorOrder.map((cardId, index) => {
        const card = EDITOR_CARDS.find((c) => c.id === cardId);
        if (!card) return null;
        const sectionId = CARD_SECTION[cardId];
        const section = sectionId ? sectionById.get(sectionId) : undefined;
        const tool = CARD_TOOL[cardId];
        const included = !tool || props.entitlement.tools.includes(tool);

        return (
          <div className="editor-section" key={cardId}>
            <details open={open === cardId} onToggle={(event) => setOpen(event.currentTarget.open ? cardId : null)}>
              <summary>
                <span className="section-icon">{String(index + 1).padStart(2, "0")}</span>
                <span>
                  <b>{card.label}</b>
                  <small>{card.hint}</small>
                </span>
                <span className="chevron" aria-hidden="true">
                  ⌄
                </span>
              </summary>

              <div className="section-body">
                {!included && (
                  <p className="hint">
                    Esta ferramenta não está incluída no plano {props.entitlement.label}. Podes preparar o conteúdo,
                    mas a secção não é publicada.
                  </p>
                )}

                {cardId === "basic" && (
                  <BasicCard profile={profile} domain={props.domain} links={props.links} onChange={patchProfile} />
                )}

                {cardId === "visual" && (
                  <VisualCard
                    appearance={appearance}
                    entitlement={props.entitlement}
                    images={props.images}
                    palette={palette}
                    onChange={patchAppearance}
                  />
                )}

                {cardId !== "basic" && cardId !== "visual" && (
                  <ManagedCard cardId={cardId} section={section} count={section?.contentIds.length ?? 0} />
                )}
              </div>
            </details>

            {/* Doc 01: ordering and visibility live on the card itself. */}
            <div className="section-controls">
              {section ? (
                <label className="visibility">
                  <input
                    type="checkbox"
                    checked={section.enabled}
                    onChange={() => toggleSection(section.id)}
                    aria-label={`Mostrar ${card.label} na página`}
                  />
                  Visível
                </label>
              ) : (
                <small>Configuração</small>
              )}
              <button
                type="button"
                onClick={() => move(cardId, -1)}
                disabled={index === 0}
                aria-label={`Subir ${card.label}`}
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(cardId, 1)}
                disabled={index === movableCards - 1}
                aria-label={`Descer ${card.label}`}
              >
                ↓
              </button>
            </div>
          </div>
        );
      })}

      <div className="page-actions">
        <div>
          <button type="button" className="secondary" onClick={save} disabled={busy !== ""}>
            {busy === "save" ? "A guardar…" : "Guardar rascunho"}
          </button>
          <Link className="secondary" href="/studio/preview" target="_blank">
            Preview do rascunho ↗
          </Link>
          <button type="button" className="primary" onClick={publish} disabled={busy !== "" || dirty}>
            {busy === "publish" ? "A publicar…" : "Publicar"}
          </button>
        </div>
        <p role="status" style={status?.tone === "error" ? { color: "var(--danger)" } : undefined}>
          {status?.text ??
            (props.publishedVersion
              ? `Versão publicada: v${props.publishedVersion}. Guardar não altera a página pública.`
              : "Ainda não existe versão publicada. Guardar não publica.")}
        </p>
      </div>
    </>
  );
}

// --- Cards -------------------------------------------------------------------

function BasicCard({
  profile,
  domain,
  links,
  onChange,
}: {
  profile: EditorProfile;
  domain: string;
  links: LinkRow[];
  onChange: (patch: Partial<EditorProfile>) => void;
}) {
  return (
    <>
      <div className="fields">
        <label className="field">
          Nome real · privado
          <input
            type="text"
            value={profile.realName}
            onChange={(event) => onChange({ realName: event.target.value })}
          />
          <small>Nunca aparece na página pública.</small>
        </label>

        <label className="field">
          Nome artístico
          <input
            type="text"
            value={profile.displayName}
            onChange={(event) => onChange({ displayName: event.target.value })}
            required
          />
        </label>

        <label className="field">
          Endereço da página
          <input
            type="text"
            value={profile.slug}
            spellCheck={false}
            onChange={(event) => onChange({ slug: event.target.value.toLowerCase() })}
          />
        </label>

        <div className="field">
          <span>Vai ficar em</span>
          <div className="address">
            {domain}/p/{profile.slug || "…"}
          </div>
          <small>Doc 01: o formato final do endereço ainda tem de ser confirmado com o proprietário.</small>
        </div>

        <label className="field">
          Cidade
          <input type="text" value={profile.city} onChange={(event) => onChange({ city: event.target.value })} />
        </label>

        <label className="field">
          País
          <input type="text" value={profile.country} onChange={(event) => onChange({ country: event.target.value })} />
        </label>

        <label className="field">
          Géneros musicais
          <input
            type="text"
            value={profile.genres}
            placeholder="Afro House, Amapiano…"
            onChange={(event) => onChange({ genres: event.target.value })}
          />
        </label>

        <label className="field">
          Frase de apresentação
          <input type="text" value={profile.tagline} onChange={(event) => onChange({ tagline: event.target.value })} />
        </label>

        <label className="field wide">
          Biografia
          <textarea rows={5} value={profile.bio} onChange={(event) => onChange({ bio: event.target.value })} />
        </label>

        <label className="field">
          Email de contacto · privado
          <input
            type="email"
            value={profile.contactEmail}
            onChange={(event) => onChange({ contactEmail: event.target.value })}
          />
        </label>

        <label className="field">
          Telefone · privado
          <input
            type="tel"
            value={profile.contactPhone}
            onChange={(event) => onChange({ contactPhone: event.target.value })}
          />
        </label>
      </div>

      <h3>Redes e plataformas</h3>
      {links.length === 0 ? (
        <div className="empty-library">
          Ainda não há links. Adiciona-os em <Link href="/studio/links">Ligações</Link>.
        </div>
      ) : (
        <ul className="activity-list">
          {links.map((link) => (
            <li key={link.id}>
              {link.platformLabel}
              {link.label ? ` · ${link.label}` : ""}
              <small>
                {link.url} · {link.placement === "hero" ? "no hero" : link.placement === "both" ? "hero e secção" : "na secção"}
              </small>
            </li>
          ))}
        </ul>
      )}
      <p className="hint">
        Os links são geridos em <Link href="/studio/links">Ligações</Link>, para não se duplicarem entre secções.
      </p>
    </>
  );
}

function VisualCard({
  appearance,
  entitlement,
  images,
  palette,
  onChange,
}: {
  appearance: EditorAppearance;
  entitlement: Entitlement;
  images: ImageOption[];
  palette: ReturnType<typeof evaluatePalette>;
  onChange: (patch: Partial<EditorAppearance>) => void;
}) {
  const template = TEMPLATES.find((t) => t.id === appearance.templateId) ?? TEMPLATES[0];

  function setColour(field: "background" | "textColor" | "accent", raw: string) {
    const hex = normaliseHex(raw);
    onChange({ [field]: hex ?? raw } as Partial<EditorAppearance>);
  }

  return (
    <>
      <h3>Template</h3>
      <div className="template-catalog">
        {TEMPLATES.map((option) => {
          const allowed = entitlement.allowedTemplates.includes(option.id);
          return (
            <button
              type="button"
              key={option.id}
              className={`template-choice ${appearance.templateId === option.id ? "selected" : ""}`}
              onClick={() => allowed && onChange({ templateId: option.id })}
              disabled={!allowed}
              aria-pressed={appearance.templateId === option.id}
            >
              <span
                className="template-frame"
                style={{
                  display: "block",
                  background: `linear-gradient(140deg, ${option.colors[0]} 55%, ${option.colors[2]})`,
                }}
              />
              <h4>
                {option.id} · {option.name}
              </h4>
              <p>{allowed ? option.description : `Não incluído no plano ${entitlement.label}`}</p>
            </button>
          );
        })}
      </div>
      <p className="hint">
        {template.imageGuidance.note} Banner: {template.imageGuidance.hero}. Retrato: {template.imageGuidance.portrait}.
        Trocar de template não apaga conteúdo.
      </p>

      <div className="fields">
        <label className="field">
          Tema da página
          <select
            value={appearance.themeMode}
            onChange={(event) => onChange({ themeMode: event.target.value as EditorAppearance["themeMode"] })}
          >
            <option value="dark">Escuro</option>
            <option value="light">Claro</option>
            <option value="system">Sistema</option>
          </select>
        </label>
      </div>

      <h3>Imagens</h3>
      {images.length === 0 ? (
        <div className="empty-library">
          A biblioteca ainda não tem imagens. Carrega-as no <Link href="/studio/press">press kit</Link> e depois
          escolhe-as aqui, sem voltar a enviar o ficheiro.
        </div>
      ) : (
        <div className="fields">
          <ImagePicker
            label="Banner / fotografia principal"
            value={appearance.heroMediaId}
            images={images}
            onChange={(heroMediaId) => onChange({ heroMediaId })}
          />
          <ImagePicker
            label="Retrato"
            value={appearance.portraitMediaId}
            images={images}
            onChange={(portraitMediaId) => onChange({ portraitMediaId })}
          />
          <ImagePicker
            label="Logo"
            value={appearance.logoMediaId}
            images={images}
            onChange={(logoMediaId) => onChange({ logoMediaId })}
          />
        </div>
      )}

      <h3>Paleta</h3>
      <div className="fields">
        <ColourField
          label="Fundo"
          value={appearance.background}
          onChange={(value) => setColour("background", value)}
        />
        <ColourField label="Texto" value={appearance.textColor} onChange={(value) => setColour("textColor", value)} />
        <ColourField label="Destaque" value={appearance.accent} onChange={(value) => setColour("accent", value)} />
      </div>

      {/* Doc 02: "Recusar fundo e destaque sem contraste; calcular texto do
          botão." The same evaluation runs on the server before saving. */}
      <div
        className="palette-sample"
        style={{
          background: appearance.background,
          color: appearance.textColor,
          padding: 24,
          borderRadius: 12,
          marginTop: 18,
        }}
      >
        <strong>Como fica o texto sobre o fundo.</strong>
        <p style={{ color: appearance.textColor, opacity: 0.75, margin: "8px 0 16px" }}>
          O texto do botão é calculado a partir do destaque.
        </p>
        <span
          style={{
            display: "inline-block",
            background: appearance.accent,
            color: textOn(appearance.accent),
            padding: "10px 20px",
            borderRadius: 30,
          }}
        >
          Pedir booking
        </span>
      </div>

      <p className="hint" role="status">
        {palette.valid
          ? "Contraste aprovado: texto ≥ 4,5:1 e destaque ≥ 3:1 sobre o fundo."
          : `Combinação recusada — ${palette.blocking
              .filter((check) => !check.passes)
              .map((check) => `${check.label} está em ${check.ratio.toFixed(2)}:1, precisa de ${check.required}:1`)
              .join(" · ")}`}
      </p>
    </>
  );
}

function ImagePicker({
  label,
  value,
  images,
  onChange,
}: {
  label: string;
  value: string | null;
  images: ImageOption[];
  onChange: (value: string | null) => void;
}) {
  return (
    <label className="field">
      {label}
      <select value={value ?? ""} onChange={(event) => onChange(event.target.value || null)}>
        <option value="">Sem imagem</option>
        {images.map((image) => (
          <option key={image.id} value={image.id}>
            {image.title}
          </option>
        ))}
      </select>
    </label>
  );
}

function ColourField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="field">
      {label}
      <span style={{ display: "flex", gap: 8 }}>
        <input
          type="color"
          value={normaliseHex(value) ?? "#000000"}
          onChange={(event) => onChange(event.target.value)}
          style={{ width: 56, padding: 4 }}
          aria-label={`${label} · seletor`}
        />
        <input
          type="text"
          value={value}
          spellCheck={false}
          onChange={(event) => onChange(event.target.value)}
          aria-label={`${label} · HEX`}
        />
      </span>
    </label>
  );
}

function ManagedCard({
  cardId,
  section,
  count,
}: {
  cardId: EditorCardId;
  section: Section | undefined;
  count: number;
}) {
  const manager = CARD_MANAGER[cardId];

  return (
    <>
      <p className="hint">
        Aqui defines apenas se esta secção aparece e em que posição. O conteúdo é gerido no menu lateral, para não
        existirem duas cópias do mesmo ficheiro.
      </p>
      <div className="capability-list">
        <span>{section?.enabled ? "Visível na página" : "Oculta na página"}</span>
        <span>{count > 0 ? `${count} itens selecionados` : "Sem seleção"}</span>
      </div>
      {manager && (
        <Link className="secondary" href={manager.href}>
          {manager.label} ↗
        </Link>
      )}
    </>
  );
}
