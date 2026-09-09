"use client";

import { useState } from "react";
import { TemplateCatalog } from "@/components/TemplateCatalog";
import { evaluatePalette, normaliseHex, textOn } from "@/lib/colors";
import type { Entitlement } from "@/lib/entitlements";
import { postJson } from "@/lib/http";
import { TEMPLATES } from "@/templates/registry";
import type { EditorAppearance, ImageOption } from "./types";

/**
 * "Imagens e cores".
 *
 * Doc 02: "Escolher template visualmente. (…) A biblioteca deve permitir
 * reutilizar imagens do press kit sem novo upload." The image bank below is the
 * prototype's `<details>` "Escolher imagens da biblioteca / press kit", with the
 * same "Usar como banner / Usar como retrato" actions.
 *
 * Doc 02 on colour: "Paletas predefinidas por template, alternativas seguras e
 * extração a partir da imagem. Edição por HEX, RGB e seletor. Recusar fundo e
 * destaque sem contraste; calcular texto do botão."
 */

interface Suggestion {
  accent: string;
  background: string;
  text: string;
}

export function VisualCard({
  artistId,
  appearance,
  entitlement,
  images,
  draftVersion,
  onChange,
}: {
  artistId: string;
  appearance: EditorAppearance;
  entitlement: Entitlement;
  images: ImageOption[];
  draftVersion: number;
  onChange: (patch: Partial<EditorAppearance>) => void;
}) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [paletteStatus, setPaletteStatus] = useState<string | null>(null);

  const template = TEMPLATES.find((t) => t.id === appearance.templateId) ?? TEMPLATES[0];
  const palette = evaluatePalette({
    background: appearance.background,
    text: appearance.textColor,
    accent: appearance.accent,
  });

  const source = appearance.heroMediaId ?? appearance.portraitMediaId ?? images[0]?.id ?? null;

  /** Doc 02: extraction runs server-side so the result does not depend on the device. */
  async function extract() {
    if (!source || extracting) return;
    setExtracting(true);
    setPaletteStatus("A analisar a imagem…");

    const result = await postJson<{ suggestions: Suggestion[]; rejected: string[] }>(
      `/api/artists/${artistId}/palette`,
      { mediaId: source },
    );

    if (!result.ok) {
      setSuggestions([]);
      setPaletteStatus(result.error);
    } else {
      setSuggestions(result.data?.suggestions ?? []);
      const rejected = result.data?.rejected?.length ?? 0;
      setPaletteStatus(
        `${result.data?.suggestions.length ?? 0} paletas com contraste suficiente` +
          (rejected ? ` · ${rejected} recusadas por contraste` : ""),
      );
    }
    setExtracting(false);
  }

  return (
    <>
      <h3>Template</h3>
      <TemplateCatalog
        mode="editor"
        artistId={artistId}
        draftVersion={draftVersion}
        current={appearance.templateId}
        allowedTemplates={entitlement.allowedTemplates}
        planLabel={entitlement.label}
        onChosen={(templateId) => onChange({ templateId })}
      />
      <p className="hint">
        {template.imageGuidance.note} Banner: {template.imageGuidance.hero}. Retrato:{" "}
        {template.imageGuidance.portrait}. Trocar de template não apaga conteúdo.
      </p>

      <div className="fields">
        <label className="field">
          Tema da página
          <select
            value={appearance.themeMode}
            onChange={(e) => onChange({ themeMode: e.target.value as EditorAppearance["themeMode"] })}
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
          A biblioteca ainda não tem imagens. Carrega-as no cartão Press kit e escolhe-as aqui, sem voltar a enviar o
          ficheiro.
        </div>
      ) : (
        <>
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

          <details className="manager-form">
            <summary>Escolher imagens da biblioteca / press kit</summary>
            <div className="library-grid">
              {images.map((image) => (
                <article className="library-item" key={image.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.viewUrl} alt={image.title} />
                  <h4>{image.title}</h4>
                  <div className="record-actions">
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => onChange({ heroMediaId: image.id })}
                      aria-pressed={appearance.heroMediaId === image.id}
                    >
                      Usar como banner
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => onChange({ portraitMediaId: image.id })}
                      aria-pressed={appearance.portraitMediaId === image.id}
                    >
                      Usar como retrato
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </details>
        </>
      )}

      <h3>Paleta da página</h3>
      <p className="hint">
        Escolhe uma imagem e extrai cores como ponto de partida. Podes ajustá-las antes de as aplicar.
      </p>

      <div className="palette-tools">
        <button type="button" className="secondary" onClick={extract} disabled={!source || extracting}>
          {extracting ? "A extrair…" : "Extrair da imagem"}
        </button>
        <span role="status">
          {paletteStatus ?? (source ? "Pronto a extrair a partir da imagem escolhida." : "Adiciona um banner ou retrato.")}
        </span>
      </div>

      {suggestions.length > 0 && (
        <div className="palette-presets">
          {suggestions.map((suggestion) => (
            <button
              type="button"
              key={suggestion.accent}
              onClick={() =>
                onChange({
                  background: suggestion.background,
                  textColor: suggestion.text,
                  accent: suggestion.accent,
                })
              }
            >
              <i style={{ background: suggestion.accent }} aria-hidden="true" />
              {suggestion.accent}
            </button>
          ))}
        </div>
      )}

      {/* Doc 02: "Paletas predefinidas por template" — the registry's own trio. */}
      <div className="palette-presets">
        {TEMPLATES.map((option) => (
          <button
            type="button"
            key={option.id}
            onClick={() =>
              onChange({
                background: option.colors[0],
                textColor: option.colors[1],
                accent: option.colors[2],
              })
            }
          >
            <i style={{ background: option.colors[2] }} aria-hidden="true" />
            Paleta {option.id} · {option.name}
          </button>
        ))}
      </div>

      <div className="color-editor">
        <ColourField label="Fundo" value={appearance.background} onChange={(v) => onChange({ background: v })} />
        <ColourField label="Texto" value={appearance.textColor} onChange={(v) => onChange({ textColor: v })} />
        <ColourField label="Cor de destaque" value={appearance.accent} onChange={(v) => onChange({ accent: v })} />
      </div>

      <div
        className="palette-sample"
        style={{ background: appearance.background, color: appearance.textColor }}
      >
        <strong>O teu nome. O teu palco.</strong>
        <p style={{ color: palette.derived.muted, margin: "8px 0 16px" }}>Biografia, música e próximos eventos.</p>
        <span
          style={{
            display: "inline-block",
            background: appearance.accent,
            color: textOn(appearance.accent),
            padding: "10px 20px",
            borderRadius: 30,
          }}
        >
          Booking
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
      {palette.advisory.some((check) => !check.passes) && (
        <p className="hint">
          A rever: {palette.advisory.filter((c) => !c.passes).map((c) => c.label).join(" · ")}. Não bloqueiam a
          gravação, mas afetam legibilidade em hover, texto secundário ou texto sobre fotografia.
        </p>
      )}
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
      <select value={value ?? ""} onChange={(e) => onChange(e.target.value || null)}>
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

/** HEX, RGB and picker, as doc 02 requires. */
function ColourField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const hex = normaliseHex(value);
  const rgb = hex
    ? [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]
    : [0, 0, 0];

  function setChannel(index: number, raw: string) {
    const next = [...rgb];
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return;
    next[index] = Math.max(0, Math.min(255, Math.round(parsed)));
    onChange(`#${next.map((c) => c.toString(16).padStart(2, "0")).join("")}`);
  }

  return (
    <label className="field">
      {label}
      <span style={{ display: "flex", gap: 8 }}>
        <input
          type="color"
          value={hex ?? "#000000"}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: 56, padding: 4 }}
          aria-label={`${label} · seletor`}
        />
        <input
          type="text"
          value={value}
          spellCheck={false}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${label} · HEX`}
        />
      </span>
      <span className="rgb-inputs">
        {["R", "G", "B"].map((channel, index) => (
          <input
            key={channel}
            type="number"
            min={0}
            max={255}
            value={rgb[index]}
            onChange={(e) => setChannel(index, e.target.value)}
            aria-label={`${label} · ${channel}`}
          />
        ))}
      </span>
    </label>
  );
}
