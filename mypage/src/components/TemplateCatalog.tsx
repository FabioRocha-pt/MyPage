"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { putJson } from "@/lib/http";
import { TEMPLATES } from "@/templates/registry";

/**
 * The shared template catalogue.
 *
 * Doc 01: "Catálogo de templates público e backoffice devem partilhar as mesmas
 * miniaturas e identificadores." This is the single component behind the landing
 * gallery, the public /templates page and the editor's "Imagens e cores" card —
 * the prototype's assets/template-catalog.js, ported.
 *
 * The thumbnail is a live, scaled iframe of `/templates/{id}`, exactly as the
 * prototype scaled `dj-template-NN.html`. Doc 01: "Se forem necessárias capturas
 * em produção, gerá-las a partir dos templates e versioná-las no mesmo catálogo"
 * — the registry already carries an optional `thumbnail`, and when it is set the
 * image is used instead of the iframe, with no consumer change.
 */

const FRAME_WIDTH = 1200;

interface Props {
  /** Currently selected template, if any. */
  current?: string;
  /**
   * Where "Escolher" leads:
   *  - "editor": writes the choice to the draft (requires an artist id).
   *  - "signup": sends a visitor to registration carrying the choice.
   */
  mode: "editor" | "signup";
  artistId?: string;
  draftVersion?: number;
  allowedTemplates?: string[];
  planLabel?: string;
  onChosen?: (templateId: string) => void;
  /** Copy is English on the landing and Portuguese in the backoffice. */
  lang?: "pt" | "en";
}

const COPY = {
  pt: {
    choose: (name: string) => `Escolher ${name}`,
    full: "Ver em tamanho real ↗",
    blocked: (plan: string) => `Não incluído no plano ${plan}`,
    saving: "A guardar…",
    saved: "Template aplicado ao rascunho.",
  },
  en: {
    choose: (name: string) => `Choose ${name}`,
    full: "Open full size ↗",
    blocked: (plan: string) => `Not included in the ${plan} plan`,
    saving: "Saving…",
    saved: "Template applied.",
  },
};

export function TemplateCatalog({
  current,
  mode,
  artistId,
  draftVersion,
  allowedTemplates,
  planLabel,
  onChosen,
  lang = "pt",
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const copy = COPY[lang];

  async function choose(id: string) {
    if (busy) return;

    if (mode === "signup") {
      router.push(`/signup?template=${id}`);
      return;
    }
    if (!artistId) return;

    setBusy(id);
    setStatus(copy.saving);
    const result = await putJson(`/api/artists/${artistId}/page/draft`, {
      version: draftVersion,
      draft: { templateId: id },
    });
    setStatus(result.ok ? copy.saved : result.error);
    if (result.ok) {
      onChosen?.(id);
      router.refresh();
    }
    setBusy(null);
  }

  return (
    <>
      <div className="template-catalog">
        {TEMPLATES.map((template) => {
          const allowed = !allowedTemplates || allowedTemplates.includes(template.id);
          return (
            <article
              className={`template-choice ${current === template.id ? "selected" : ""}`}
              key={template.id}
              data-template={template.id}
            >
              <TemplateFrame id={template.id} name={template.name} thumbnail={template.thumbnail} />
              <h4>
                {template.id} · {template.name}
              </h4>
              <p>{allowed ? template.description : copy.blocked(planLabel ?? "")}</p>
              <button
                type="button"
                className="secondary"
                aria-pressed={current === template.id}
                disabled={!allowed || busy !== null}
                onClick={() => choose(template.id)}
              >
                {copy.choose(template.name)}
              </button>
              <a href={`/templates/${template.id}`} target="_blank" rel="noopener">
                {copy.full}
              </a>
            </article>
          );
        })}
      </div>
      {status && (
        <p className="hint" role="status">
          {status}
        </p>
      )}
    </>
  );
}

/**
 * A live preview of the template, scaled to the card.
 *
 * The prototype used a ResizeObserver to keep `scale(width/1200)` in step with
 * the card; the same trick is used here so the thumbnail stays sharp at any
 * breakpoint instead of being a fixed-size screenshot.
 */
function TemplateFrame({ id, name, thumbnail }: { id: string; name: string; thumbnail?: string }) {
  const frame = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.21);

  useEffect(() => {
    const node = frame.current;
    if (!node || thumbnail) return;
    const observer = new ResizeObserver(() => setScale(node.clientWidth / FRAME_WIDTH));
    observer.observe(node);
    return () => observer.disconnect();
  }, [thumbnail]);

  return (
    <div className="template-frame" ref={frame}>
      {thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumbnail} alt={`Pré-visualização do template ${name}`} />
      ) : (
        <iframe
          src={`/templates/${id}`}
          title={`Pré-visualização do template ${name}`}
          loading="lazy"
          sandbox=""
          tabIndex={-1}
          style={{ transform: `scale(${scale})` }}
        />
      )}
    </div>
  );
}
