"use client";

import { useEffect, useRef, useState } from "react";

/**
 * "Pedido de ferramenta" from the landing page.
 *
 * Doc 01: "Secção de pedido de ferramenta abaixo do toolkit: nome, descrição,
 * referências/anexos e contacto quando não autenticado."
 * Doc 02: "Fora da conta, na landing, será necessário recolher contacto."
 *
 * Attachments are deliberately absent here: POST /api/tool-requests only
 * accepts media ids that already belong to an artist, so an anonymous visitor
 * has nothing to attach to. The form says so instead of pretending otherwise.
 */
export function ToolRequestForm() {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<{ text: string; tone: "" | "is-ok" | "is-error" }>({
    text: "A equipa entra em contacto depois de analisar o pedido.",
    tone: "",
  });
  const firstField = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focus = window.setTimeout(() => firstField.current?.focus(), 120);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(focus);
    };
  }, [open]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;

    const form = new FormData(event.currentTarget);
    setSending(true);
    setStatus({ text: "A enviar…", tone: "" });

    try {
      const response = await fetch("/api/tool-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.get("title"),
          description: form.get("description"),
          contactEmail: form.get("contactEmail"),
          contactPhone: form.get("contactPhone") || undefined,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setStatus({ text: payload?.error?.message ?? "Não foi possível enviar o pedido.", tone: "is-error" });
        return;
      }
      setStatus({ text: payload.message ?? "Pedido registado.", tone: "is-ok" });
      event.currentTarget.reset();
    } catch {
      setStatus({ text: "Sem ligação ao servidor. Tenta novamente.", tone: "is-error" });
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <button type="button" className="lp-btn primary" onClick={() => setOpen(true)}>
        Descrever ferramenta ↗
      </button>

      {open && (
        <div className="lp-modal" role="dialog" aria-modal="true" aria-labelledby="lp-toolkit-title">
          <button
            type="button"
            className="lp-modal-backdrop"
            aria-label="Fechar formulário"
            onClick={() => setOpen(false)}
          />
          <div className="lp-modal-panel">
            <div className="lp-modal-head">
              <div>
                <div className="lp-eyebrow">Pedido personalizado</div>
                <h3 id="lp-toolkit-title">Descreve a tua ferramenta</h3>
              </div>
              <button
                type="button"
                className="lp-modal-close"
                onClick={() => setOpen(false)}
                aria-label="Fechar formulário"
              >
                ×
              </button>
            </div>

            <form className="lp-form" onSubmit={submit}>
              <div className="lp-field full">
                <label htmlFor="lp-tool-title">Nome da ferramenta</label>
                <input
                  ref={firstField}
                  id="lp-tool-title"
                  name="title"
                  type="text"
                  maxLength={160}
                  placeholder="ex.: reservas de mesa VIP"
                  required
                />
              </div>

              <div className="lp-field full">
                <label htmlFor="lp-tool-description">O que precisas?</label>
                <textarea
                  id="lp-tool-description"
                  name="description"
                  maxLength={4000}
                  placeholder="Descreve o problema, como a ferramenta deve funcionar e quem a vai usar…"
                  required
                />
              </div>

              <div className="lp-field">
                <label htmlFor="lp-tool-email">Email</label>
                <input id="lp-tool-email" name="contactEmail" type="email" placeholder="tu@email.com" required />
              </div>

              <div className="lp-field">
                <label htmlFor="lp-tool-phone">Telefone / WhatsApp</label>
                <input id="lp-tool-phone" name="contactPhone" type="tel" maxLength={40} placeholder="+238 …" />
              </div>

              <p className="lp-field full lp-form-status">
                Para anexar PDFs ou imagens de referência, envia o pedido a partir da tua conta: os anexos ficam
                associados à biblioteca do artista.
              </p>

              <div className="lp-form-actions">
                <span className={`lp-form-status ${status.tone}`} role="status">
                  {status.text}
                </span>
                <button className="lp-btn primary" type="submit" disabled={sending}>
                  {sending ? "A enviar…" : "Enviar pedido ↗"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
