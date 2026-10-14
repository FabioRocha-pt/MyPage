"use client";

import { CONTENT_LIMITS, type PageContent } from "@/lib/page-content";
import type { ImageOption, SelectableItem } from "./types";

/**
 * Editors for the structured content brought by Templates 02 and 01 · versão 1:
 * biography chapters, numbers, discography, gallery, highlights, rider and the
 * public booking contact. Everything here edits one `PageContent` document that
 * is saved with the draft ("Atualizar página") and validated again on the
 * server, so these components hold no rules of their own beyond the limits.
 *
 * `Page3Fields` holds the extra content of Página 3 · DJs & Producers
 * (template 06), shown inside the matching cards only while that template is
 * the one chosen.
 */

type Patch = (patch: Partial<PageContent>) => void;

// --- Generic list ------------------------------------------------------------

interface FieldSpec<T> {
  key: keyof T & string;
  label: string;
  type?: "text" | "url" | "image";
  placeholder?: string;
  wide?: boolean;
}

function RowsEditor<T extends object>({
  rows,
  fields,
  make,
  max,
  addLabel,
  images = [],
  onChange,
}: {
  rows: T[];
  fields: FieldSpec<T>[];
  make: () => T;
  max: number;
  addLabel: string;
  images?: ImageOption[];
  onChange: (rows: T[]) => void;
}) {
  const set = (index: number, key: keyof T, value: string) =>
    onChange(rows.map((row, i) => (i === index ? ({ ...row, [key]: value === "" ? null : value } as T) : row)));
  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <>
      {rows.map((row, index) => (
        <div className="repeat-item" key={index}>
          <div className="fields">
            {fields.map((field) => {
              const value = (row[field.key] as unknown as string | null | undefined) ?? "";
              if (field.type === "image") {
                return (
                  <label className={`field${field.wide ? " wide" : ""}`} key={field.key}>
                    {field.label}
                    <select value={value} onChange={(e) => set(index, field.key, e.target.value)}>
                      <option value="">Escolher imagem…</option>
                      {images.map((image) => (
                        <option key={image.id} value={image.id}>
                          {image.title}
                        </option>
                      ))}
                    </select>
                  </label>
                );
              }
              return (
                <label className={`field${field.wide ? " wide" : ""}`} key={field.key}>
                  {field.label}
                  <input
                    type={field.type === "url" ? "url" : "text"}
                    value={value}
                    placeholder={field.placeholder}
                    onChange={(e) => set(index, field.key, e.target.value)}
                  />
                </label>
              );
            })}
          </div>
          <div className="record-actions">
            <button type="button" className="quiet" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Subir">
              ↑
            </button>
            <button
              type="button"
              className="quiet"
              onClick={() => move(index, 1)}
              disabled={index === rows.length - 1}
              aria-label="Descer"
            >
              ↓
            </button>
            <button type="button" className="remove quiet" onClick={() => onChange(rows.filter((_, i) => i !== index))}>
              Remover
            </button>
          </div>
        </div>
      ))}
      <button type="button" className="secondary" onClick={() => onChange([...rows, make()])} disabled={rows.length >= max}>
        ＋ {addLabel}
      </button>
      {rows.length >= max && <p className="hint">Máximo de {max}.</p>}
    </>
  );
}

function StringList({
  values,
  label,
  addLabel,
  max,
  onChange,
}: {
  values: string[];
  label: string;
  addLabel: string;
  max: number;
  onChange: (values: string[]) => void;
}) {
  return (
    <RowsEditor
      rows={values.map((value) => ({ value }))}
      fields={[{ key: "value", label, wide: true }]}
      make={() => ({ value: "" })}
      max={max}
      addLabel={addLabel}
      onChange={(rows) => onChange(rows.map((row) => (row.value as string | null) ?? ""))}
    />
  );
}

function Toggle({ checked, label, hint, onChange }: { checked: boolean; label: string; hint?: string; onChange: (value: boolean) => void }) {
  return (
    <label className="field wide" style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <b style={{ color: "var(--text)" }}>{label}</b>
        {hint && (
          <>
            <br />
            <small>{hint}</small>
          </>
        )}
      </span>
    </label>
  );
}

// --- Basic information: chapters and numbers -----------------------------------

export function StoryFields({
  bio,
  content,
  images,
  onChange,
}: {
  bio: string;
  content: PageContent;
  images: ImageOption[];
  onChange: Patch;
}) {
  const paragraphs = bio
    .split(/\n{2,}/)
    .map((text) => text.trim())
    .filter(Boolean);

  return (
    <>
      <h3>Capítulos da biografia</h3>
      <p className="hint">
        Cada parágrafo da biografia é um capítulo. Nos templates 01 e 02 a fotografia e a marca acompanham o capítulo que está
        a ser lido. Separa os parágrafos com uma linha vazia.
      </p>
      <div className="fields">
        <label className="field">
          Função · linha acima do nome
          <input
            type="text"
            placeholder="DJ · Produtor"
            value={content.roleLine ?? ""}
            onChange={(e) => onChange({ roleLine: e.target.value || null })}
          />
        </label>
        <label className="field">
          Alcunha · por baixo do nome
          <input
            type="text"
            placeholder="The Machine"
            value={content.nickname ?? ""}
            onChange={(e) => onChange({ nickname: e.target.value || null })}
          />
          <small>No template 01 aparece entre aspas, na cor de destaque.</small>
        </label>
        {paragraphs.slice(0, CONTENT_LIMITS.bioMarks).map((paragraph, index) => (
          <label className="field" key={index}>
            Marca do capítulo {String(index + 1).padStart(2, "0")}
            <input
              type="text"
              placeholder="2018 · Praia"
              value={content.bioMarks[index] ?? ""}
              onChange={(e) => {
                const marks = [...content.bioMarks];
                while (marks.length <= index) marks.push("");
                marks[index] = e.target.value;
                onChange({ bioMarks: marks });
              }}
            />
            <small>{paragraph.slice(0, 90)}{paragraph.length > 90 ? "…" : ""}</small>
          </label>
        ))}
      </div>

      <h3>Fotografias da biografia</h3>
      <p className="hint">
        Pela ordem dos capítulos; repetem-se se houver menos fotografias do que capítulos. Sem nenhuma, usa a galeria.
        Só aparecem as imagens públicas.
      </p>
      <RowsEditor
        rows={content.bioPhotoIds.map((mediaId) => ({ mediaId }))}
        fields={[{ key: "mediaId", label: "Fotografia", type: "image", wide: true }]}
        make={() => ({ mediaId: images[0]?.id ?? "" })}
        max={CONTENT_LIMITS.bioPhotos}
        addLabel="Adicionar fotografia"
        images={images}
        onChange={(rows) => onChange({ bioPhotoIds: rows.map((row) => (row.mediaId as string | null) ?? "").filter(Boolean) })}
      />

      <h3>Números em destaque</h3>
      <p className="hint">
        Até seis. O número conta até ao valor quando aparece no ecrã: “3M+”, “11”, “2018”. Na Página 3 são a audiência, e o
        link abre a rede que contam.
      </p>
      <RowsEditor
        rows={content.stats}
        fields={[
          { key: "value", label: "Valor", placeholder: "3M+" },
          { key: "label", label: "Descrição", placeholder: "visualizações em Pidi La" },
          { key: "url", label: "Link · opcional", type: "url", placeholder: "https://", wide: true },
        ]}
        make={() => ({ value: "", label: "", url: null })}
        max={CONTENT_LIMITS.stats}
        addLabel="Adicionar número"
        onChange={(stats) => onChange({ stats: stats.map((s) => ({ value: s.value ?? "", label: s.label ?? "", url: s.url })) })}
      />
    </>
  );
}

// --- Images and colours: the second logo -------------------------------------------

export function LogoDarkField({ content, images, onChange }: { content: PageContent; images: ImageOption[]; onChange: Patch }) {
  return (
    <div className="fields">
      <label className="field">
        Logo escuro · para fundos claros
        <select value={content.logoDarkMediaId ?? ""} onChange={(e) => onChange({ logoDarkMediaId: e.target.value || null })}>
          <option value="">Sem imagem</option>
          {images.map((image) => (
            <option key={image.id} value={image.id}>
              {image.title}
            </option>
          ))}
        </select>
        <small>No template 02 vai no rótulo do vinil. Sem ele, usa o logo principal.</small>
      </label>
      <label className="field">
        Logo do hero · opcional
        <select value={content.logoHeroMediaId ?? ""} onChange={(e) => onChange({ logoHeroMediaId: e.target.value || null })}>
          <option value="">O logo principal</option>
          {images.map((image) => (
            <option key={image.id} value={image.id}>
              {image.title}
            </option>
          ))}
        </select>
        <small>No template 01 ocupa o lugar do nome no hero, quando é diferente do da barra (um monograma empilhado, por exemplo).</small>
      </label>
    </div>
  );
}

// --- Music: discography --------------------------------------------------------------

export function DiscographyFields({ content, onChange }: { content: PageContent; onChange: Patch }) {
  return (
    <>
      <h3>Discografia</h3>
      <p className="hint">Temas e colaborações. Um link do YouTube abre no pop up da página; os outros abrem numa aba nova.</p>
      <RowsEditor
        rows={content.discography}
        fields={[
          { key: "title", label: "Tema", placeholder: "PIDI LA" },
          { key: "with", label: "Com · opcional", placeholder: "CESF" },
          { key: "year", label: "Ano · opcional", placeholder: "2025" },
          { key: "type", label: "Tipo · opcional", placeholder: "EP, Collab" },
          { key: "url", label: "Link · opcional", type: "url", placeholder: "https://", wide: true },
        ]}
        make={() => ({ title: "", with: null, year: null, url: null, type: null })}
        max={CONTENT_LIMITS.discography}
        addLabel="Adicionar tema"
        onChange={(rows) =>
          onChange({ discography: rows.map((r) => ({ title: r.title ?? "", with: r.with, year: r.year, url: r.url, type: r.type })) })
        }
      />
    </>
  );
}

// --- Gallery ---------------------------------------------------------------------------

export function GalleryCard({ content, images, onChange }: { content: PageContent; images: ImageOption[]; onChange: Patch }) {
  return (
    <>
      <p className="hint">
        A primeira fotografia fica maior. No pop up há descarregar e partilhar; o original só é descarregável quando a
        fotografia está num álbum público do press kit. Só aparecem imagens públicas. Para pôr um vídeo do YouTube na
        galeria, deixa a fotografia vazia e cola o link: fica com a capa do vídeo e abre no pop up.
      </p>
      {images.length === 0 ? (
        <div className="empty-library">A biblioteca ainda não tem imagens. Carrega-as no cartão Press kit.</div>
      ) : (
        <RowsEditor
          rows={content.gallery}
          fields={[
            { key: "mediaId", label: "Fotografia", type: "image", wide: true },
            { key: "videoUrl", label: "Ou vídeo do YouTube", type: "url", placeholder: "https://www.youtube.com/watch?v=…", wide: true },
            { key: "caption", label: "Legenda", placeholder: "Palco principal, pirotecnia" },
            { key: "credit", label: "Crédito do fotógrafo", placeholder: "Nome do fotógrafo" },
          ]}
          make={() => ({ mediaId: images[0]?.id ?? "", videoUrl: null, caption: null, credit: null })}
          max={CONTENT_LIMITS.gallery}
          addLabel="Adicionar fotografia"
          images={images}
          onChange={(rows) =>
            onChange({
              // Rows stay while they are being filled in (a video row starts with
              // the photo cleared); the server drops the ones left empty and keeps
              // the photo when a row has both.
              gallery: rows.map((row) => ({
                mediaId: row.mediaId || null,
                videoUrl: row.videoUrl,
                caption: row.caption,
                credit: row.credit,
              })),
            })
          }
        />
      )}
    </>
  );
}

// --- Highlights ----------------------------------------------------------------------------

export function HighlightsCard({ content, onChange }: { content: PageContent; onChange: Patch }) {
  return (
    <>
      <p className="hint">
        Prémios, festivais, palcos e marcos. Com um link do YouTube, o cartão ganha a imagem do vídeo e abre-o no pop up.
      </p>
      <RowsEditor
        rows={content.highlights}
        fields={[
          { key: "title", label: "Título", placeholder: "Afro Nation Portimão 2025" },
          { key: "detail", label: "Detalhe", placeholder: "Palco principal" },
          { key: "type", label: "Tipo", placeholder: "Festival" },
          { key: "year", label: "Ano", placeholder: "2025" },
          { key: "videoUrl", label: "Vídeo do YouTube · opcional", type: "url", placeholder: "https://www.youtube.com/watch?v=…", wide: true },
        ]}
        make={() => ({ title: "", detail: null, type: null, year: null, videoUrl: null })}
        max={CONTENT_LIMITS.highlights}
        addLabel="Adicionar destaque"
        onChange={(rows) =>
          onChange({
            highlights: rows.map((r) => ({ title: r.title ?? "", detail: r.detail, type: r.type, year: r.year, videoUrl: r.videoUrl })),
          })
        }
      />
    </>
  );
}

// --- Rider and booking contact -----------------------------------------------------------

export function RiderCard({ content, images, onChange }: { content: PageContent; images: ImageOption[]; onChange: Patch }) {
  const { booking, rider } = content;
  const setBooking = (patch: Partial<PageContent["booking"]>) => onChange({ booking: { ...booking, ...patch } });
  const setRider = (patch: Partial<PageContent["rider"]>) => onChange({ rider: { ...rider, ...patch } });

  return (
    <>
      <p className="hint">
        Nos templates 01 e 02 isto forma a página de booking: pedido, rider técnico com esquema e hospitalidade. Os PDF do
        rider e do press kit vêm do Press kit (categorias Rider técnico e Biografia / EPK).
      </p>

      <h3>Contacto de booking</h3>
      <div className="fields">
        <label className="field">
          Quem responde
          <input type="text" placeholder="Diego" value={booking.contactName ?? ""} onChange={(e) => setBooking({ contactName: e.target.value || null })} />
        </label>
        <label className="field">
          Papel
          <input type="text" placeholder="Manager" value={booking.contactRole ?? ""} onChange={(e) => setBooking({ contactRole: e.target.value || null })} />
        </label>
        <label className="field">
          Telefone
          <input type="tel" placeholder="+238 …" value={booking.phone ?? ""} onChange={(e) => setBooking({ phone: e.target.value || null })} />
        </label>
        <label className="field">
          Email · opcional
          <input type="email" value={booking.email ?? ""} onChange={(e) => setBooking({ email: e.target.value || null })} />
        </label>
        <Toggle
          checked={booking.whatsapp}
          label="Este número tem WhatsApp"
          hint="Mostra o botão WhatsApp e deixa o promotor continuar o pedido por lá, já escrito."
          onChange={(whatsapp) => setBooking({ whatsapp })}
        />
        <Toggle
          checked={booking.showPublic}
          label="Mostrar este contacto na página pública"
          hint="A página é indexada pelo Google: o número fica visível para qualquer pessoa. Desligado, os pedidos chegam só pelo formulário."
          onChange={(showPublic) => setBooking({ showPublic })}
        />
      </div>

      <h3>Rider</h3>
      <div className="fields">
        <Toggle
          checked={rider.isPublic}
          label="Rider público na página"
          hint="Desligado, o rider fica guardado aqui e só é enviado a pedido do promotor."
          onChange={(isPublic) => setRider({ isPublic })}
        />
      </div>

      <h3>Rider técnico</h3>
      <RowsEditor
        rows={rider.technical}
        fields={[
          { key: "qty", label: "Quantidade", placeholder: "3x" },
          { key: "item", label: "Equipamento", placeholder: "Pioneer CDJ-3000 ou CDJ-2000NXS2" },
        ]}
        make={() => ({ qty: "1x", item: "" })}
        max={CONTENT_LIMITS.riderLines}
        addLabel="Adicionar equipamento"
        onChange={(rows) => setRider({ technical: rows.map((r) => ({ qty: r.qty ?? "", item: r.item ?? "" })) })}
      />
      <h3>Notas técnicas</h3>
      <StringList values={rider.notes} label="Nota" addLabel="Adicionar nota" max={CONTENT_LIMITS.notes} onChange={(notes) => setRider({ notes })} />

      <div className="fields">
        <label className="field">
          Esquema de ligações
          <select value={rider.diagramMediaId ?? ""} onChange={(e) => setRider({ diagramMediaId: e.target.value || null })}>
            <option value="">Sem esquema</option>
            {images.map((image) => (
              <option key={image.id} value={image.id}>
                {image.title}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Legenda do esquema
          <input type="text" value={rider.diagramCaption ?? ""} onChange={(e) => setRider({ diagramCaption: e.target.value || null })} />
        </label>
      </div>

      <h3>Hospitalidade</h3>
      <RowsEditor
        rows={rider.hospitality}
        fields={[
          { key: "qty", label: "Quantidade", placeholder: "6x" },
          { key: "item", label: "Item", placeholder: "Águas" },
        ]}
        make={() => ({ qty: "1x", item: "" })}
        max={CONTENT_LIMITS.riderLines}
        addLabel="Adicionar item"
        onChange={(rows) => setRider({ hospitality: rows.map((r) => ({ qty: r.qty ?? "", item: r.item ?? "" })) })}
      />
      <div className="fields">
        <label className="field wide">
          Bilhetes para convidados
          <input
            type="text"
            placeholder="Artista, manager e 4 bilhetes para convidados."
            value={rider.guestTickets ?? ""}
            onChange={(e) => setRider({ guestTickets: e.target.value || null })}
          />
        </label>
      </div>
      <h3>Avisos</h3>
      <StringList values={rider.notices} label="Aviso" addLabel="Adicionar aviso" max={CONTENT_LIMITS.notes} onChange={(notices) => setRider({ notices })} />
    </>
  );
}

// --- Página 3 · DJs & Producers (template 06) ------------------------------------------

function MediaSelect({
  label,
  value,
  options,
  empty,
  hint,
  onChange,
}: {
  label: string;
  value: string | null;
  options: Array<{ id: string; title: string }>;
  empty: string;
  hint?: string;
  onChange: (value: string | null) => void;
}) {
  return (
    <label className="field">
      {label}
      <select value={value ?? ""} onChange={(e) => onChange(e.target.value || null)}>
        <option value="">{empty}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.title}
          </option>
        ))}
      </select>
      {hint && <small>{hint}</small>}
    </label>
  );
}

function TextField({
  label,
  value,
  placeholder,
  hint,
  wide,
  onChange,
}: {
  label: string;
  value: string | null;
  placeholder?: string;
  hint?: string;
  wide?: boolean;
  onChange: (value: string | null) => void;
}) {
  return (
    <label className={`field${wide ? " wide" : ""}`}>
      {label}
      <input type="text" value={value ?? ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value || null)} />
      {hint && <small>{hint}</small>}
    </label>
  );
}

export type Page3Part = "basic" | "music" | "highlights" | "video" | "gallery" | "rider";

/** The extra content of Página 3, split by the card it belongs to. */
export function Page3Fields({
  part,
  content,
  images,
  videos,
  onChange,
}: {
  part: Page3Part;
  content: PageContent;
  images: ImageOption[];
  videos: SelectableItem[];
  onChange: Patch;
}) {
  const { stories, galleryFilm } = content;
  const setStories = (patch: Partial<PageContent["stories"]>) => onChange({ stories: { ...stories, ...patch } });
  const setFilm = (patch: Partial<PageContent["galleryFilm"]>) => onChange({ galleryFilm: { ...galleryFilm, ...patch } });

  if (part === "basic") {
    return (
      <>
        <h3>Página 3 · hero</h3>
        <p className="hint">
          Na Página 3 o logo do hero é obrigatório (Imagens e cores). A “Função” acima aparece na vertical ao lado do logo. Na
          frase do hero, a segunda linha fica na cor de destaque.
        </p>
        <div className="fields">
          <label className="field wide">
            Frase do hero
            <textarea
              rows={2}
              placeholder={"Feel it.\nDon’t explain it."}
              value={content.heroStatement ?? ""}
              onChange={(e) => onChange({ heroStatement: e.target.value || null })}
            />
          </label>
        </div>
        <h3>Recortes do hero</h3>
        <p className="hint">Até três PNG com fundo transparente. Os primeiros ficam atrás, a preto e branco; o último à frente.</p>
        <RowsEditor
          rows={content.heroPhotoIds.map((mediaId) => ({ mediaId }))}
          fields={[{ key: "mediaId", label: "Recorte", type: "image", wide: true }]}
          make={() => ({ mediaId: images[0]?.id ?? "" })}
          max={CONTENT_LIMITS.heroPhotos}
          addLabel="Adicionar recorte"
          images={images}
          onChange={(rows) => onChange({ heroPhotoIds: rows.map((row) => (row.mediaId as string | null) ?? "").filter(Boolean) })}
        />
        <h3>Faixa em movimento</h3>
        <p className="hint">As palavras da faixa por baixo do hero. Vazia, usa os géneros.</p>
        <StringList
          values={content.ticker}
          label="Palavra"
          addLabel="Adicionar palavra"
          max={CONTENT_LIMITS.ticker}
          onChange={(ticker) => onChange({ ticker })}
        />
        <div className="fields">
          <TextField
            label="Origem dos números"
            wide
            value={content.statsNote}
            placeholder="Audience figures from the artist press kit. Not live counts."
            hint="Os números da audiência não são contagens em tempo real: diz de onde vêm."
            onChange={(statsNote) => onChange({ statsNote })}
          />
        </div>
        <h3>Factos da biografia</h3>
        <RowsEditor
          rows={content.facts}
          fields={[
            { key: "value", label: "Valor", placeholder: "2003" },
            { key: "label", label: "Descrição", placeholder: "Sameblood founded" },
          ]}
          make={() => ({ value: "", label: "", url: null })}
          max={CONTENT_LIMITS.stats}
          addLabel="Adicionar facto"
          onChange={(rows) => onChange({ facts: rows.map((r) => ({ value: r.value ?? "", label: r.label ?? "", url: null })) })}
        />
        <h3>Percurso</h3>
        <RowsEditor
          rows={content.timeline}
          fields={[
            { key: "period", label: "Ano ou período", placeholder: "2010" },
            { key: "title", label: "Título", placeholder: "Beyond borders" },
            { key: "text", label: "Descrição", wide: true },
          ]}
          make={() => ({ period: "", title: "", text: null })}
          max={CONTENT_LIMITS.timeline}
          addLabel="Adicionar marco"
          onChange={(rows) => onChange({ timeline: rows.map((r) => ({ period: r.period ?? "", title: r.title ?? "", text: r.text })) })}
        />
      </>
    );
  }

  if (part === "music") {
    return (
      <>
        <h3>Página 3 · colaborações</h3>
        <p className="hint">Um grupo por linha: “Mozambique”, “International”. Os nomes separados por “ · ”.</p>
        <RowsEditor
          rows={content.collaborations}
          fields={[
            { key: "label", label: "Grupo", placeholder: "International" },
            { key: "names", label: "Nomes", wide: true },
          ]}
          make={() => ({ label: "", names: "" })}
          max={CONTENT_LIMITS.collaborations}
          addLabel="Adicionar grupo"
          onChange={(rows) => onChange({ collaborations: rows.map((r) => ({ label: r.label ?? "", names: r.names ?? "" })) })}
        />
        <div className="fields">
          <MediaSelect
            label="Fotografia ao lado dos projetos"
            value={content.musicPhotoId}
            options={images}
            empty="Sem fotografia"
            onChange={(musicPhotoId) => onChange({ musicPhotoId })}
          />
        </div>
      </>
    );
  }

  if (part === "highlights") {
    return (
      <div className="fields">
        <MediaSelect
          label="Página 3 · fotografia ao lado dos prémios"
          value={content.highlightsPhotoId}
          options={images}
          empty="Sem fotografia"
          hint="Os quatro primeiros destaques aparecem; os restantes ficam em “More recognition”."
          onChange={(highlightsPhotoId) => onChange({ highlightsPhotoId })}
        />
      </div>
    );
  }

  if (part === "video") {
    return (
      <>
        <h3>Página 3 · Stories</h3>
        <p className="hint">
          Um vídeo da biblioteca (ficheiro carregado, público), uma fotografia editorial e os créditos das campanhas. Não associes
          as imagens a campanhas a que não pertencem: os créditos ficam numa lista à parte.
        </p>
        <div className="fields">
          <MediaSelect label="Vídeo" value={stories.reelMediaId} options={videos} empty="Sem vídeo" onChange={(reelMediaId) => setStories({ reelMediaId })} />
          <MediaSelect
            label="Capa do vídeo"
            value={stories.posterMediaId}
            options={images}
            empty="Sem capa"
            onChange={(posterMediaId) => setStories({ posterMediaId })}
          />
          <TextField label="Título do vídeo" value={stories.reelTitle} placeholder="Artist reel" onChange={(reelTitle) => setStories({ reelTitle })} />
          <MediaSelect
            label="Fotografia editorial"
            value={stories.photoMediaId}
            options={images}
            empty="Sem fotografia"
            onChange={(photoMediaId) => setStories({ photoMediaId })}
          />
          <TextField
            label="Legenda da fotografia"
            value={stories.photoCaption}
            placeholder="The vision behind the sound."
            onChange={(photoCaption) => setStories({ photoCaption })}
          />
          <label className="field">
            Tipografia grande
            <textarea
              rows={2}
              placeholder={"Make\nit felt."}
              value={stories.statement ?? ""}
              onChange={(e) => setStories({ statement: e.target.value || null })}
            />
          </label>
          <TextField label="Introdução" wide value={stories.intro} onChange={(intro) => setStories({ intro })} />
          <TextField label="Nota dos créditos" wide value={stories.creditsNote} onChange={(creditsNote) => setStories({ creditsNote })} />
        </div>
        <h3>Créditos das campanhas</h3>
        <RowsEditor
          rows={stories.credits}
          fields={[
            { key: "year", label: "Ano", placeholder: "2024" },
            { key: "title", label: "Campanha", placeholder: "Cantando pela Vida" },
            { key: "client", label: "Cliente", placeholder: "MPDC" },
          ]}
          make={() => ({ year: null, title: "", client: null })}
          max={CONTENT_LIMITS.credits}
          addLabel="Adicionar crédito"
          onChange={(rows) => setStories({ credits: rows.map((r) => ({ year: r.year, title: r.title ?? "", client: r.client })) })}
        />
      </>
    );
  }

  if (part === "gallery") {
    return (
      <>
        <h3>Página 3 · filme por baixo da galeria</h3>
        <div className="fields">
          <MediaSelect label="Vídeo" value={galleryFilm.mediaId} options={videos} empty="Sem vídeo" onChange={(mediaId) => setFilm({ mediaId })} />
          <MediaSelect label="Capa" value={galleryFilm.posterMediaId} options={images} empty="Sem capa" onChange={(posterMediaId) => setFilm({ posterMediaId })} />
          <TextField label="Título" value={galleryFilm.title} placeholder="Music Experience" onChange={(title) => setFilm({ title })} />
        </div>
      </>
    );
  }

  return (
    <>
      <h3>Página 3 · emails de booking por região</h3>
      <p className="hint">
        Só aparecem com “Mostrar este contacto na página pública” ligado. A página não recebe pedidos: leva aos contactos.
      </p>
      <RowsEditor
        rows={content.booking.regions}
        fields={[
          { key: "label", label: "Região", placeholder: "Rest of the world" },
          { key: "email", label: "Email", placeholder: "booking@…" },
        ]}
        make={() => ({ label: "", email: "" })}
        max={CONTENT_LIMITS.regions}
        addLabel="Adicionar região"
        onChange={(rows) =>
          onChange({ booking: { ...content.booking, regions: rows.map((r) => ({ label: r.label ?? "", email: r.email ?? "" })) } })
        }
      />
    </>
  );
}
