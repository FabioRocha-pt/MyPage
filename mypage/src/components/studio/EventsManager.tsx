"use client";

import { useState } from "react";
import { deleteJson, getJson, patchJson, postJson } from "@/lib/http";
import { DismissibleNotice } from "./DismissibleNotice";

/**
 * Events.
 *
 * Doc 02: "Gestão lateral independente: cartaz (upload/biblioteca ou URL), nome,
 * data/hora, local, descrição e link de bilhetes; criar/editar/remover. Na
 * página, selecionar eventos e controlar posição/visibilidade."
 *
 * Doc 01: "Gestor simples local agora; integração automática Muska depois;
 * Page só seleciona." Rows that came from Muska are read-only here, because a
 * later sync would overwrite a local edit — the API marks them `editable:false`
 * and this screen respects it.
 */

export interface EventRow {
  id: string;
  source: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  venue: string | null;
  city: string | null;
  country: string | null;
  description: string | null;
  ticketsUrl: string | null;
  posterUrl: string | null;
  posterMediaId: string | null;
  isArchived: boolean;
  editable: boolean;
}

interface Props {
  artistId: string;
  initialEvents: EventRow[];
  images: { id: string; title: string }[];
  muskaConnected: boolean;
}

const EMPTY = {
  title: "",
  startsAt: "",
  endsAt: "",
  venue: "",
  city: "",
  country: "",
  description: "",
  ticketsUrl: "",
  posterUrl: "",
  posterMediaId: "",
};

export function EventsManager({ artistId, initialEvents, images, muskaConnected }: Props) {
  const [events, setEvents] = useState(initialEvents);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ text: string; bad?: boolean } | null>(null);

  async function reload() {
    const result = await getJson<{ items: EventRow[] }>(`/api/artists/${artistId}/events`);
    if (result.ok && result.data) setEvents(result.data.items);
  }

  function edit(row: EventRow) {
    setEditing(row.id);
    setForm({
      title: row.title,
      startsAt: toLocalInput(row.startsAt),
      endsAt: row.endsAt ? toLocalInput(row.endsAt) : "",
      venue: row.venue ?? "",
      city: row.city ?? "",
      country: row.country ?? "",
      description: row.description ?? "",
      ticketsUrl: row.ticketsUrl ?? "",
      posterUrl: row.posterUrl ?? "",
      posterMediaId: row.posterMediaId ?? "",
    });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setStatus(null);

    const payload = {
      title: form.title,
      startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : "",
      endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
      venue: form.venue || null,
      city: form.city || null,
      country: form.country || null,
      description: form.description || null,
      ticketsUrl: form.ticketsUrl || null,
      posterUrl: form.posterUrl || null,
      posterMediaId: form.posterMediaId || null,
    };

    const result = editing
      ? await patchJson(`/api/events/${editing}`, payload)
      : await postJson(`/api/artists/${artistId}/events`, payload);

    if (!result.ok) {
      setStatus({ text: result.error ?? "Não foi possível guardar.", bad: true });
    } else {
      setStatus({ text: editing ? "Evento atualizado." : "Evento criado." });
      setForm(EMPTY);
      setEditing(null);
      await reload();
    }
    setBusy(false);
  }

  async function remove(row: EventRow) {
    if (busy) return;
    setBusy(true);
    const result = await deleteJson(`/api/events/${row.id}`);
    setStatus(
      result.ok
        ? { text: `"${row.title}" removido.` }
        : { text: result.error ?? "Não foi possível remover.", bad: true },
    );
    await reload();
    setBusy(false);
  }

  async function sync() {
    if (busy) return;
    setBusy(true);
    const result = await postJson<{ created: number; updated: number; reconciled: number; archived: number }>(
      `/api/artists/${artistId}/events`,
      { action: "sync" },
    );
    setStatus(
      result.ok && result.data
        ? {
            text: `Sincronização Muska: ${result.data.created} novos, ${result.data.updated} atualizados, ${result.data.reconciled} reconciliados, ${result.data.archived} arquivados.`,
          }
        : { text: result.error ?? "Sincronização indisponível.", bad: true },
    );
    await reload();
    setBusy(false);
  }

  return (
    <div className="manager">
      {!muskaConnected && (
        <DismissibleNotice id="events-muska">
          A integração com o catálogo Muska ainda não está ligada. Os eventos criados aqui são locais e serão
          reconciliados quando a ligação existir, sem duplicar registos.
        </DismissibleNotice>
      )}

      <div className="view-head">
        <div>
          <h2>Eventos</h2>
          <p>Cria e edita as datas. Na Page escolhes quais aparecem e em que posição.</p>
        </div>
        <button type="button" className="secondary" onClick={sync} disabled={busy}>
          Sincronizar com Muska
        </button>
      </div>

      <form className="manager-form" onSubmit={submit}>
        <h3>{editing ? "Editar evento" : "Novo evento"}</h3>
        <div className="fields">
          <label className="field">
            Nome do evento
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </label>
          <label className="field">
            Início
            <input
              type="datetime-local"
              value={form.startsAt}
              onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
              required
            />
          </label>
          <label className="field">
            Fim · opcional
            <input
              type="datetime-local"
              value={form.endsAt}
              onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
            />
          </label>
          <label className="field">
            Local
            <input type="text" value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} />
          </label>
          <label className="field">
            Cidade
            <input type="text" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </label>
          <label className="field">
            País
            <input type="text" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
          </label>
          <label className="field">
            Link de bilhetes
            <input
              type="url"
              placeholder="https://"
              value={form.ticketsUrl}
              onChange={(e) => setForm({ ...form, ticketsUrl: e.target.value })}
            />
            <small>A compra sai da página; o vendedor é indicado no destino.</small>
          </label>
          <label className="field">
            Cartaz da biblioteca
            <select
              value={form.posterMediaId}
              onChange={(e) => setForm({ ...form, posterMediaId: e.target.value })}
            >
              <option value="">Sem cartaz</option>
              {images.map((image) => (
                <option key={image.id} value={image.id}>
                  {image.title}
                </option>
              ))}
            </select>
          </label>
          <label className="field wide">
            Cartaz por URL · alternativa
            <input
              type="url"
              placeholder="https://"
              value={form.posterUrl}
              onChange={(e) => setForm({ ...form, posterUrl: e.target.value })}
            />
          </label>
          <label className="field wide">
            Descrição
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </label>
        </div>

        <button type="submit" className="primary" disabled={busy}>
          {editing ? "Guardar alterações" : "Criar evento"}
        </button>
        {editing && (
          <button
            type="button"
            className="quiet"
            onClick={() => {
              setEditing(null);
              setForm(EMPTY);
            }}
          >
            Cancelar edição
          </button>
        )}
        {status && (
          <p className="hint" role="status" style={status.bad ? { color: "var(--danger)" } : undefined}>
            {status.text}
          </p>
        )}
      </form>

      <h3>Agenda</h3>
      {events.length === 0 ? (
        <div className="empty-library">Ainda não há eventos. O primeiro que criares aparece aqui.</div>
      ) : (
        <div className="record-grid">
          {events.map((row) => (
            <article className="record-card" key={row.id}>
              <h4>{row.title}</h4>
              <small>{formatEventDate(row.startsAt)}</small>
              <small>{[row.venue, row.city, row.country].filter(Boolean).join(" · ") || "Local por definir"}</small>
              <small>{row.source === "muska" ? "Origem: catálogo Muska" : "Criado no My Page"}</small>
              <div className="record-actions">
                {row.editable ? (
                  <>
                    <button type="button" className="secondary" onClick={() => edit(row)} disabled={busy}>
                      Editar
                    </button>
                    <button type="button" className="quiet" onClick={() => remove(row)} disabled={busy}>
                      Remover
                    </button>
                  </>
                ) : (
                  <span className="badge">Gerido no Muska</span>
                )}
                {row.ticketsUrl && (
                  <a className="secondary" href={row.ticketsUrl} target="_blank" rel="noopener noreferrer">
                    Bilhetes ↗
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

/** ISO → value accepted by <input type="datetime-local">, in local time. */
function toLocalInput(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatEventDate(iso: string): string {
  return new Intl.DateTimeFormat("pt-PT", {
    weekday: "short",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}
