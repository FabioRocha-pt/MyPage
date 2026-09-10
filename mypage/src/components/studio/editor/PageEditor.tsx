"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Entitlement } from "@/lib/entitlements";
import { putJson, postJson } from "@/lib/http";
import {
  EDITOR_CARDS,
  sectionMeta,
  type EditorCardId,
  type Section,
  type SectionId,
} from "@/lib/page-model";
import { DismissibleNotice } from "../DismissibleNotice";
import { ToolRequestsManager, type ToolRequestRow } from "../ToolRequestsManager";
import { BasicCard } from "./BasicCard";
import { PressCard } from "./PressCard";
import { SelectionCard } from "./SelectionCard";
import { VisualCard } from "./VisualCard";
import {
  CARD_SECTION,
  CARD_TOOL,
  type AlbumRow,
  type EditorAppearance,
  type EditorProfile,
  type ImageOption,
  type LinkRow,
  type PlatformOption,
  type PressCategoryRow,
  type SelectableItem,
} from "./types";

/**
 * The page editor.
 *
 * Doc 01: "Em Page, ordenar no próprio cartão, sem uma segunda secção 'Ordem da
 * página'." The arrows and the visibility switch sit in each card's header; the
 * prototype's separate `layout-manager` is gone, exactly as backoffice-v4.js
 * removed it.
 *
 * Doc 02: "Separar no modelo definitivo `editorOrder` de `sectionOrder`."
 * Moving a card reorders the editor list and, when the card also feeds a public
 * section, that section with it. `visual` is configuration: it has no arrows'
 * counterpart in the public order and no visibility switch.
 *
 * Doc 01: "Atualizar página, Preview e Publicar no fundo. (…) Não confundir
 * guardar com publicar." Saving never touches the published page.
 */

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
  platforms: PlatformOption[];
  pressCategories: PressCategoryRow[];
  albums: AlbumRow[];
  audio: SelectableItem[];
  videos: SelectableItem[];
  events: SelectableItem[];
  toolRequests: ToolRequestRow[];
  toolAttachments: { id: string; title: string }[];
  contactEmail: string;
  publishedVersion: number | null;
}

type Status = { text: string; tone: "" | "ok" | "error" } | null;

/**
 * Derives the public section order from the editor card order.
 *
 * The two lists cannot be kept in step by swapping both: they have different
 * lengths and different members. `visual` is a card with no section, `hero` is a
 * pinned section with no card, so the nth card and the nth section are not the
 * same thing. Swapping each independently drifted as soon as a card moved past
 * `visual` — the editor showed Biografia above Press kit while the published
 * page rendered the opposite.
 *
 * Re-deriving instead of swapping makes that drift unrepresentable: the card
 * order is the single source of truth, and `editorOrder` stays separate from
 * `sections` in the payload exactly as doc 02 requires.
 */
function alignSectionsToEditor(order: EditorCardId[], sections: Section[]): Section[] {
  const byId = new Map(sections.map((section) => [section.id, section]));
  const pinned = sections.filter((section) => sectionMeta(section.id).pinned);

  const ordered: Section[] = [];
  for (const cardId of order) {
    const sectionId = CARD_SECTION[cardId];
    if (!sectionId) continue;
    const section = byId.get(sectionId);
    if (section && !sectionMeta(section.id).pinned) ordered.push(section);
  }

  // A section no card drives keeps its relative order after the derived ones,
  // so a future section type cannot be dropped by an editor that predates it.
  const placed = new Set(ordered.map((section) => section.id));
  const rest = sections.filter(
    (section) => !sectionMeta(section.id).pinned && !placed.has(section.id),
  );

  return [...pinned, ...ordered, ...rest].map((section, position) => ({ ...section, position }));
}

export function PageEditor(props: PageEditorProps) {
  /**
   * A draft saved by the version that swapped both lists independently can
   * already hold a section order the cards never expressed. Aligning on load
   * makes the editor honest, and the mismatch is surfaced as unsaved changes:
   * `publish` reads the stored draft on the server, not this state, so the
   * repair only reaches the public page once it is saved.
   */
  const alignedSections = useMemo(
    () => alignSectionsToEditor(props.initialEditorOrder, props.initialSections),
    [props.initialEditorOrder, props.initialSections],
  );
  const driftedOnLoad =
    alignedSections.map((section) => section.id).join() !==
    props.initialSections.map((section) => section.id).join();

  const [profile, setProfile] = useState(props.initialProfile);
  const [appearance, setAppearance] = useState(props.initialAppearance);
  const [editorOrder, setEditorOrder] = useState(props.initialEditorOrder);
  const [sections, setSections] = useState(alignedSections);
  const [links, setLinks] = useState(props.links);
  const [pressCategories, setPressCategories] = useState(props.pressCategories);
  const [albums, setAlbums] = useState(props.albums);
  const [version, setVersion] = useState(props.initialVersion);
  const [dirty, setDirty] = useState(driftedOnLoad);
  const [busy, setBusy] = useState<"" | "save" | "publish">("");
  const [status, setStatus] = useState<Status>(null);
  const [open, setOpen] = useState<EditorCardId | null>("basic");
  const [toolsOpen, setToolsOpen] = useState(false);

  // The dashboard links to /studio/page#visual and friends; open that card.
  // `#tools` is not a card: it is the tool-request accordion below the ordered
  // list, and it is where the tool.created / tool.answered notifications land.
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (EDITOR_CARDS.some((card) => card.id === hash)) setOpen(hash as EditorCardId);
    else if (hash === "tools") setToolsOpen(true);
  }, []);

  const sectionById = useMemo(() => new Map(sections.map((s) => [s.id, s])), [sections]);

  function patchProfile(patch: Partial<EditorProfile>) {
    setProfile((current) => ({ ...current, ...patch }));
    setDirty(true);
  }

  function patchAppearance(patch: Partial<EditorAppearance>) {
    setAppearance((current) => ({ ...current, ...patch }));
    setDirty(true);
  }

  function move(cardId: EditorCardId, direction: -1 | 1) {
    const index = editorOrder.indexOf(cardId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= editorOrder.length) return;

    const nextOrder = [...editorOrder];
    [nextOrder[index], nextOrder[target]] = [nextOrder[target], nextOrder[index]];

    setEditorOrder(nextOrder);
    setSections((current) => alignSectionsToEditor(nextOrder, current));
    setDirty(true);
  }

  function toggleSection(sectionId: SectionId) {
    setSections((current) =>
      current.map((section) => (section.id === sectionId ? { ...section, enabled: !section.enabled } : section)),
    );
    setDirty(true);
  }

  function toggleContent(sectionId: SectionId, contentId: string) {
    setSections((current) =>
      current.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              contentIds: section.contentIds.includes(contentId)
                ? section.contentIds.filter((id) => id !== contentId)
                : [...section.contentIds, contentId],
            }
          : section,
      ),
    );
    setDirty(true);
  }

  async function save() {
    if (busy) return;
    setBusy("save");
    setStatus(null);

    const result = await putJson<{ version: number }>(`/api/artists/${props.artistId}/page/draft`, {
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
      draft: { ...appearance, editorOrder, sections },
    });

    if (!result.ok) {
      setStatus({ text: result.error ?? "Não foi possível guardar.", tone: "error" });
    } else {
      setVersion(result.data?.version ?? version + 1);
      setDirty(false);
      setStatus({ text: "Rascunho guardado. A página pública só muda depois de publicares.", tone: "ok" });
    }
    setBusy("");
  }

  async function publish() {
    if (busy) return;
    if (dirty) {
      setStatus({ text: "Atualiza a página antes de publicar.", tone: "error" });
      return;
    }
    setBusy("publish");
    setStatus(null);

    const result = await postJson<{ version: number; url: string; warnings: string[] }>(
      `/api/artists/${props.artistId}/page/publish`,
      {},
    );

    if (!result.ok) {
      const details = result.details as { errors?: string[] } | null;
      setStatus({
        text: details?.errors?.length ? `${result.error} ${details.errors.join(" · ")}` : (result.error ?? "Erro."),
        tone: "error",
      });
    } else {
      const warnings = result.data?.warnings ?? [];
      setStatus({
        text: `Publicado (versão ${result.data?.version}) em ${result.data?.url}.${
          warnings.length ? ` Avisos: ${warnings.join(" · ")}` : ""
        }`,
        tone: "ok",
      });
    }
    setBusy("");
  }

  return (
    <>
      <DismissibleNotice id="page-editor-draft">
        Escolhe a ordem e as secções visíveis no próprio cartão. Tudo fica no rascunho; a página pública só muda
        quando carregares em Publicar.
      </DismissibleNotice>

      <div className="view-head">
        <div>
          <h2>Faz dela a tua página.</h2>
          <p>Abre cada cartão para escolher o conteúdo. Usa as setas no próprio cartão para mudar a ordem.</p>
        </div>
        <span className={`badge ${dirty ? "is-draft" : ""}`}>
          {dirty ? "Alterações por guardar" : `Rascunho v${version}`}
        </span>
      </div>

      <div className="page-sections">
        {editorOrder.map((cardId, index) => {
          const card = EDITOR_CARDS.find((c) => c.id === cardId);
          if (!card) return null;
          const sectionId = CARD_SECTION[cardId];
          const section = sectionId ? sectionById.get(sectionId) : undefined;
          const tool = CARD_TOOL[cardId];
          const included = !tool || props.entitlement.tools.includes(tool);

          return (
            <div className="editor-section" key={cardId}>
              <details
                className="accordion"
                open={open === cardId}
                onToggle={(event) => setOpen(event.currentTarget.open ? cardId : null)}
              >
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
                      Esta ferramenta não está incluída no plano {props.entitlement.label}. Podes preparar o
                      conteúdo, mas a secção não é publicada.
                    </p>
                  )}

                  {cardId === "basic" && (
                    <BasicCard
                      artistId={props.artistId}
                      profile={profile}
                      domain={props.domain}
                      links={links}
                      platforms={props.platforms}
                      onChange={patchProfile}
                      onLinksChanged={setLinks}
                    />
                  )}

                  {cardId === "visual" && (
                    <VisualCard
                      artistId={props.artistId}
                      appearance={appearance}
                      entitlement={props.entitlement}
                      images={props.images}
                      draftVersion={version}
                      onChange={patchAppearance}
                    />
                  )}

                  {cardId === "press" && (
                    <PressCard
                      artistId={props.artistId}
                      categories={pressCategories}
                      albums={albums}
                      onCategoriesChanged={setPressCategories}
                      onAlbumsChanged={setAlbums}
                      onUploaded={() => setStatus({ text: "Biblioteca atualizada. Recarrega para a ver em Imagens e cores.", tone: "" })}
                    />
                  )}

                  {cardId === "music" && (
                    <SelectionCard
                      cardId="music"
                      items={props.audio}
                      selected={section?.contentIds ?? []}
                      emptyLabel="A biblioteca de áudio está vazia. Adiciona faixas, sets ou links em Áudio."
                      onToggle={(id) => toggleContent("music", id)}
                    />
                  )}

                  {cardId === "video" && (
                    <SelectionCard
                      cardId="video"
                      items={props.videos}
                      selected={section?.contentIds ?? []}
                      emptyLabel="A biblioteca de vídeo está vazia. Adiciona vídeos ou links em Vídeos."
                      onToggle={(id) => toggleContent("video", id)}
                    />
                  )}

                  {cardId === "events" && (
                    <SelectionCard
                      cardId="events"
                      items={props.events}
                      selected={section?.contentIds ?? []}
                      allMeansAll
                      emptyLabel="Ainda não há eventos. Cria-os em Eventos e escolhe aqui quais aparecem."
                      onToggle={(id) => toggleContent("events", id)}
                    />
                  )}

                  {(cardId === "booking" || cardId === "donations" || cardId === "store") && (
                    <SelectionCard
                      cardId={cardId}
                      items={[]}
                      selected={[]}
                      emptyLabel=""
                      onToggle={() => {}}
                    />
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
                    {section.enabled ? "Visível" : "Oculta"}
                  </label>
                ) : (
                  <small title="Configuração visual, não é uma secção pública">Aparência</small>
                )}
                <button
                  type="button"
                  data-move="up"
                  onClick={() => move(cardId, -1)}
                  disabled={index === 0}
                  aria-label={`Subir ${card.label}`}
                >
                  ↑
                </button>
                <button
                  type="button"
                  data-move="down"
                  onClick={() => move(cardId, 1)}
                  disabled={index === editorOrder.length - 1}
                  aria-label={`Descer ${card.label}`}
                >
                  ↓
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/*
        "Pedir uma ferramenta" sits after the ordered list, exactly where
        backoffice-v4.js moves it. It is not a page section, so it has no
        arrows and no visibility switch.
      */}
      <div className="editor-section" id="tools">
        <details className="accordion" open={toolsOpen}>
          <summary>
            <span className="section-icon">＋</span>
            <span>
              <b>Pedir uma ferramenta</b>
              <small>Conta à equipa My Page o que precisas</small>
            </span>
            <span className="chevron" aria-hidden="true">
              ⌄
            </span>
          </summary>
          <div className="section-body">
            <ToolRequestsManager
              contactEmail={props.contactEmail}
              attachments={props.toolAttachments}
              initialRequests={props.toolRequests}
              embedded
            />
          </div>
        </details>
      </div>

      <div className="page-actions">
        <div>
          <button type="button" className="secondary" onClick={save} disabled={busy !== ""}>
            {busy === "save" ? "A guardar…" : "Atualizar página"}
          </button>
          <Link className="secondary" href="/studio/preview" target="_blank">
            Preview ↗
          </Link>
          <button type="button" className="primary" onClick={publish} disabled={busy !== "" || dirty}>
            {busy === "publish" ? "A publicar…" : "Publicar"}
          </button>
        </div>
        <p role="status" style={status?.tone === "error" ? { color: "var(--danger)" } : undefined}>
          {status?.text ??
            (props.publishedVersion
              ? `Atualizar guarda o rascunho. Versão publicada: v${props.publishedVersion} — o público só muda quando publicares.`
              : "Atualizar guarda o rascunho. Ainda não existe versão publicada.")}
        </p>
      </div>
    </>
  );
}
