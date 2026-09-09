"use client";

import { useState } from "react";

/**
 * Public booking form.
 *
 * Doc 02: "Front final: pedir data específica ou pedido aberto/flexível;
 * contacto do promotor, local, contexto e mensagem. Pedido não equivale a
 * reserva confirmada."
 *
 * The last sentence is reflected in the success copy — the form never tells the
 * promoter the date is booked.
 */

interface Props {
  slug: string;
  availability: Array<{ start: string; end: string; status: string }>;
}

type Mode = "specific" | "flexible";

export function BookingForm({ slug, availability }: Props) {
  const [mode, setMode] = useState<Mode>("specific");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  const openWindows = availability.filter((slot) => slot.status === "available").slice(0, 4);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setState("sending");

    const form = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = {
      slug,
      dateMode: mode,
      promoterName: form.get("promoterName"),
      promoterEmail: form.get("promoterEmail"),
      promoterPhone: form.get("promoterPhone") || undefined,
      organisation: form.get("organisation") || undefined,
      city: form.get("city") || undefined,
      country: form.get("country") || undefined,
      venue: form.get("venue") || undefined,
      eventType: form.get("eventType") || undefined,
      message: form.get("message") || undefined,
    };

    if (mode === "specific") {
      payload.requestedDate = form.get("requestedDate");
    } else {
      payload.flexibleFrom = form.get("flexibleFrom");
      payload.flexibleTo = form.get("flexibleTo");
    }

    try {
      const response = await fetch("/api/booking-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error?.message ?? "Não foi possível enviar o pedido.");
      setState("sent");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Erro inesperado.");
      setState("idle");
    }
  }

  if (state === "sent") {
    return (
      <div className="tpl-form-done" role="status">
        <strong>Pedido enviado.</strong>
        <p>
          Isto não é uma reserva confirmada. O artista vai analisar a disponibilidade e responder ao
          contacto indicado.
        </p>
      </div>
    );
  }

  return (
    <form className="tpl-form" onSubmit={submit}>
      {openWindows.length > 0 && (
        <p className="tpl-form-hint">
          Janelas indicadas como disponíveis:{" "}
          {openWindows
            .map((slot) => `${slot.start.slice(0, 10)} → ${slot.end.slice(0, 10)}`)
            .join(" · ")}
          . Dias sem indicação significam disponibilidade por confirmar.
        </p>
      )}

      <div className="tpl-form-modes" role="group" aria-label="Tipo de pedido">
        <button
          type="button"
          className={mode === "specific" ? "is-active" : ""}
          aria-pressed={mode === "specific"}
          onClick={() => setMode("specific")}
        >
          Data específica
        </button>
        <button
          type="button"
          className={mode === "flexible" ? "is-active" : ""}
          aria-pressed={mode === "flexible"}
          onClick={() => setMode("flexible")}
        >
          Datas flexíveis
        </button>
      </div>

      <div className="tpl-form-grid">
        <label>
          <span>Nome *</span>
          <input name="promoterName" required maxLength={120} autoComplete="name" />
        </label>
        <label>
          <span>Email *</span>
          <input name="promoterEmail" type="email" required maxLength={200} autoComplete="email" />
        </label>
        <label>
          <span>Telefone</span>
          <input name="promoterPhone" type="tel" maxLength={40} autoComplete="tel" />
        </label>
        <label>
          <span>Organização</span>
          <input name="organisation" maxLength={160} autoComplete="organization" />
        </label>

        {mode === "specific" ? (
          <label>
            <span>Data pretendida *</span>
            <input name="requestedDate" type="date" required />
          </label>
        ) : (
          <>
            <label>
              <span>A partir de *</span>
              <input name="flexibleFrom" type="date" required />
            </label>
            <label>
              <span>Até *</span>
              <input name="flexibleTo" type="date" required />
            </label>
          </>
        )}

        <label>
          <span>Cidade</span>
          <input name="city" maxLength={80} />
        </label>
        <label>
          <span>País</span>
          <input name="country" maxLength={80} />
        </label>
        <label>
          <span>Local / venue</span>
          <input name="venue" maxLength={160} />
        </label>
        <label>
          <span>Tipo de evento</span>
          <input name="eventType" maxLength={120} placeholder="Clube, festival, evento privado" />
        </label>
        <label className="tpl-form-full">
          <span>Mensagem</span>
          <textarea name="message" rows={4} maxLength={4000} />
        </label>
      </div>

      {error && (
        <p className="tpl-form-error" role="alert">
          {error}
        </p>
      )}

      <div className="tpl-form-actions">
        <button className="tpl-cta" type="submit" disabled={state === "sending"}>
          {state === "sending" ? "A enviar…" : "Enviar pedido"}
        </button>
        <small>Um pedido não confirma automaticamente a data.</small>
      </div>
    </form>
  );
}
