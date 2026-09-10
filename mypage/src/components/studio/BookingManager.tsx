"use client";

import { useMemo, useState } from "react";
import { deleteJson, getJson, patchJson, postJson } from "@/lib/http";
import { DismissibleNotice } from "./DismissibleNotice";

/**
 * Booking.
 *
 * Doc 02: "Prioridade: disponibilidade do DJ. Calendário com eventos já
 * existentes e intervalos Disponível, Indisponível e Reserva provisória. Dias
 * sem indicação significam por confirmar."
 *
 * Doc 02 also: "Pedido não equivale a reserva confirmada." The status buttons
 * below only offer the transitions the server allows, and confirming is the
 * only action that writes to the calendar — never receiving a request.
 */

export interface Slot {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  privateNote: string | null;
  holdExpiresAt: string | null;
  expired: boolean;
}

export interface CalendarEvent {
  id: string;
  title: string;
  startsAt: string;
}

export interface BookingRow {
  id: string;
  promoterName: string;
  promoterEmail: string;
  promoterPhone: string | null;
  organisation: string | null;
  dateMode: string;
  requestedDate: string | null;
  flexibleFrom: string | null;
  flexibleTo: string | null;
  city: string | null;
  country: string | null;
  venue: string | null;
  eventType: string | null;
  message: string | null;
  status: string;
  privateNote: string | null;
  createdAt: string;
}

/**
 * Mirrors TRANSITIONS in lib/booking.ts, which cannot be imported here because
 * it pulls in next/server. The server re-checks every transition, so this map
 * only decides which buttons to draw.
 */
const TRANSITIONS: Record<string, string[]> = {
  new: ["in_contact", "declined", "cancelled"],
  in_contact: ["proposal", "declined", "cancelled"],
  proposal: ["confirmed", "declined", "cancelled"],
  confirmed: ["cancelled"],
  declined: [],
  cancelled: [],
};

const STATUS_LABEL: Record<string, string> = {
  new: "Novo",
  in_contact: "Em contacto",
  proposal: "Proposta enviada",
  confirmed: "Confirmado",
  declined: "Recusado",
  cancelled: "Cancelado",
};

const SLOT_LABEL: Record<string, string> = {
  available: "Disponível",
  busy: "Indisponível",
  hold: "Reserva provisória",
};

interface Props {
  artistId: string;
  initialSlots: Slot[];
  initialEvents: CalendarEvent[];
  initialRequests: BookingRow[];
  timezone: string;
}

export function BookingManager({ artistId, initialSlots, initialEvents, initialRequests, timezone }: Props) {
  const [slots, setSlots] = useState(initialSlots);
  const [events] = useState(initialEvents);
  const [requests, setRequests] = useState(initialRequests);
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [form, setForm] = useState({ startsAt: "", endsAt: "", status: "available", privateNote: "" });
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ text: string; bad?: boolean } | null>(null);

  const days = useMemo(() => buildMonth(cursor, slots, events), [cursor, slots, events]);

  async function reloadSlots() {
    const result = await getJson<{ slots: Slot[] }>(`/api/artists/${artistId}/availability`);
    if (result.ok && result.data) setSlots(result.data.slots);
  }

  async function reloadRequests() {
    const result = await getJson<{ items: BookingRow[] }>(`/api/booking-requests?artistId=${artistId}`);
    if (result.ok && result.data) setRequests(result.data.items);
  }

  async function addSlot(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setStatus(null);

    const result = await postJson(`/api/artists/${artistId}/availability`, {
      startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : "",
      endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : "",
      status: form.status,
      privateNote: form.privateNote || null,
      timezone,
    });

    if (!result.ok) {
      setStatus({ text: result.error ?? "Não foi possível guardar o intervalo.", bad: true });
    } else {
      setStatus({ text: "Intervalo guardado." });
      setForm({ startsAt: "", endsAt: "", status: "available", privateNote: "" });
      await reloadSlots();
    }
    setBusy(false);
  }

  async function removeSlot(slot: Slot) {
    if (busy) return;
    setBusy(true);
    const result = await deleteJson(`/api/availability/${slot.id}`);
    setStatus(result.ok ? { text: "Intervalo removido." } : { text: result.error ?? "Erro.", bad: true });
    await reloadSlots();
    setBusy(false);
  }

  async function changeStatus(row: BookingRow, next: string) {
    if (busy) return;
    setBusy(true);
    const result = await patchJson(`/api/booking-requests/${row.id}`, { status: next });
    setStatus(
      result.ok
        ? { text: `Pedido de ${row.promoterName}: ${STATUS_LABEL[next] ?? next}.` }
        : { text: result.error ?? "Transição recusada.", bad: true },
    );
    await Promise.all([reloadRequests(), reloadSlots()]);
    setBusy(false);
  }

  return (
    <div className="manager">
      <DismissibleNotice id="booking-holds">
        Um pedido recebido não confirma data. Só a transição para “Confirmado” bloqueia o calendário, e as reservas
        provisórias expiram ao fim de 14 dias.
      </DismissibleNotice>

      <div className="view-head">
        <div>
          <h2>Booking</h2>
          <p>Disponibilidade, calendário e pedidos. Fuso: {timezone}.</p>
        </div>
      </div>

      <div className="month-head">
        <button type="button" className="secondary" onClick={() => setCursor(addMonths(cursor, -1))}>
          ← Mês anterior
        </button>
        <strong>{monthLabel(cursor)}</strong>
        <button type="button" className="secondary" onClick={() => setCursor(addMonths(cursor, 1))}>
          Mês seguinte →
        </button>
      </div>

      {/* Seven columns cannot be read at 360px, so on a phone the month scrolls
          sideways inside this wrapper rather than losing days or notes. */}
      <div className="calendar-scroll">
        <div className="calendar">
          {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((weekday) => (
            <div className="weekday" key={weekday}>
              {weekday}
            </div>
          ))}
          {days.map((day) => (
            <div key={day.key} className={day.className}>
              {day.label}
              {day.notes.map((note, index) => (
                <small key={index}>{note}</small>
              ))}
            </div>
          ))}
        </div>
      </div>
      <p className="hint">
        Dias sem indicação significam “por confirmar”. Os eventos já criados aparecem no calendário para evitares
        marcar disponibilidade por cima de um show.
      </p>

      <form className="manager-form" onSubmit={addSlot}>
        <h3>Novo intervalo</h3>
        <div className="fields">
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
            Fim
            <input
              type="datetime-local"
              value={form.endsAt}
              onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
              required
            />
          </label>
          <label className="field">
            Estado
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="available">Disponível</option>
              <option value="busy">Indisponível</option>
              <option value="hold">Reserva provisória</option>
            </select>
          </label>
          <label className="field wide">
            Nota privada
            <input
              type="text"
              value={form.privateNote}
              onChange={(e) => setForm({ ...form, privateNote: e.target.value })}
            />
            <small>Só tu vês esta nota. Nunca entra na página pública.</small>
          </label>
        </div>
        <button type="submit" className="primary" disabled={busy}>
          Guardar intervalo
        </button>
        {status && (
          <p className="hint" role="status" style={status.bad ? { color: "var(--danger)" } : undefined}>
            {status.text}
          </p>
        )}
      </form>

      <h3>Intervalos definidos</h3>
      {slots.length === 0 ? (
        <div className="empty-library">Ainda não definiste disponibilidade.</div>
      ) : (
        <ul className="activity-list">
          {slots.map((slot) => (
            <li key={slot.id}>
              {SLOT_LABEL[slot.status] ?? slot.status} · {formatRange(slot.startsAt, slot.endsAt)}
              {slot.expired && " · reserva expirada"}
              <small>
                {slot.privateNote ? `${slot.privateNote} · ` : ""}
                <button type="button" className="quiet" onClick={() => removeSlot(slot)} disabled={busy}>
                  Remover
                </button>
              </small>
            </li>
          ))}
        </ul>
      )}

      <h3>Pedidos recebidos</h3>
      {requests.length === 0 ? (
        <div className="empty-library">
          Ainda não há pedidos. Quando a secção Booking estiver visível na página publicada, os pedidos dos
          promotores chegam aqui.
        </div>
      ) : (
        <div className="record-grid">
          {requests.map((row) => (
            <article className="record-card" key={row.id}>
              <h4>{row.promoterName}</h4>
              <small>{STATUS_LABEL[row.status] ?? row.status}</small>
              <small>
                {row.dateMode === "specific"
                  ? row.requestedDate
                    ? formatDate(row.requestedDate)
                    : "Data por definir"
                  : `Flexível: ${row.flexibleFrom ? formatDate(row.flexibleFrom) : "?"} → ${
                      row.flexibleTo ? formatDate(row.flexibleTo) : "?"
                    }`}
              </small>
              <small>{[row.venue, row.city, row.country].filter(Boolean).join(" · ") || "Local por indicar"}</small>
              <small>
                {row.promoterEmail}
                {row.promoterPhone ? ` · ${row.promoterPhone}` : ""}
              </small>
              {row.message && <small>“{row.message}”</small>}
              <div className="record-actions">
                {(TRANSITIONS[row.status] ?? []).map((next) => (
                  <button
                    key={next}
                    type="button"
                    className={next === "confirmed" ? "primary" : "secondary"}
                    onClick={() => changeStatus(row, next)}
                    disabled={busy}
                  >
                    {STATUS_LABEL[next] ?? next}
                  </button>
                ))}
                {(TRANSITIONS[row.status] ?? []).length === 0 && <span className="badge">Estado final</span>}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Calendar helpers --------------------------------------------------------

interface Day {
  key: string;
  label: string;
  className: string;
  notes: string[];
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

function monthLabel(date: Date): string {
  return new Intl.DateTimeFormat("pt-PT", { month: "long", year: "numeric" }).format(date);
}

function buildMonth(cursor: Date, slots: Slot[], events: CalendarEvent[]): Day[] {
  const first = startOfMonth(cursor);
  // Monday-first grid.
  const offset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const days: Day[] = [];

  // `pad`, not `weekday`: these are the blank cells before the 1st, and reusing
  // the header class made them indistinguishable from the seven column titles.
  for (let index = 0; index < offset; index += 1) {
    days.push({ key: `pad-${index}`, label: "", className: "pad", notes: [] });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(cursor.getFullYear(), cursor.getMonth(), day);
    const dayStart = date.getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000 - 1;

    const covering = slots.filter((slot) => {
      const start = new Date(slot.startsAt).getTime();
      const end = new Date(slot.endsAt).getTime();
      return start <= dayEnd && end >= dayStart;
    });

    const dayEvents = events.filter((event) => {
      const start = new Date(event.startsAt).getTime();
      return start >= dayStart && start <= dayEnd;
    });

    const busy = covering.some((slot) => slot.status !== "available");
    const available = covering.some((slot) => slot.status === "available");

    days.push({
      key: `day-${day}`,
      label: String(day),
      className: busy || dayEvents.length ? "busy" : available ? "available" : "",
      notes: [
        ...covering.map((slot) => SLOT_LABEL[slot.status] ?? slot.status),
        ...dayEvents.map((event) => event.title),
      ],
    });
  }

  return days;
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(iso));
}

function formatRange(from: string, to: string): string {
  const formatter = new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${formatter.format(new Date(from))} → ${formatter.format(new Date(to))}`;
}
