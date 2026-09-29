"use client";

import { CONTENT_LIMITS, type PageContent } from "@/lib/page-content";
import type { ImageOption } from "./types";

/**
 * Editors for the structured content brought by Templates 02 and 01 · versão 1:
 * biography chapters, numbers, discography, gallery, highlights, rider and the
 * public booking contact. Everything here edits one `PageContent` document that
 * is saved with the draft ("Atualizar página") and validated again on the
 * server, so these components hold no rules of their own beyond the limits.
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
      <p className="hint">Até seis. O número conta até ao valor quando aparece no ecrã: “3M+”, “11”, “2018”.</p>
      <RowsEditor
        rows={content.stats}
        fields={[
          { key: "value", label: "Valor", placeholder: "3M+" },
          { key: "label", label: "Descrição", placeholder: "visualizações em Pidi La" },
        ]}
        make={() => ({ value: "", label: "" })}
        max={CONTENT_LIMITS.stats}
        addLabel="Adicionar número"
        onChange={(stats) => onChange({ stats: stats.map((s) => ({ value: s.value ?? "", label: s.label ?? "" })) })}
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
          { key: "url", label: "Link · opcional", type: "url", placeholder: "https://", wide: true },
        ]}
        make={() => ({ title: "", with: null, year: null, url: null })}
        max={CONTENT_LIMITS.discography}
        addLabel="Adicionar tema"
        onChange={(rows) => onChange({ discography: rows.map((r) => ({ title: r.title ?? "", with: r.with, year: r.year, url: r.url })) })}
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
