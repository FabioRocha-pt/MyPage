"use client";

import { useEffect, useRef, useState } from "react";

/**
 * "Describe your toolkit" — the landing's custom-request modal.
 *
 * Copy is the prototype's, in the English the landing uses. Doc 01: "Secção de
 * pedido de ferramenta abaixo do toolkit: nome, descrição, referências/anexos e
 * contacto quando não autenticado." Doc 02: "Fora da conta, na landing, será
 * necessário recolher contacto."
 *
 * The prototype offered a file drop here. POST /api/tool-requests only accepts
 * media ids that already belong to an artist, so an anonymous visitor has
 * nothing to attach to: the form says where attachments do work instead of
 * accepting files it would have to throw away.
 */
export function ToolRequestForm() {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<{ text: string; tone: "" | "is-ok" | "is-error" }>({
    text: "Our team will contact you after reviewing the request.",
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

    const form = event.currentTarget;
    const data = new FormData(form);
    setSending(true);
    setStatus({ text: "Sending…", tone: "" });

    try {
      const response = await fetch("/api/tool-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.get("title"),
          description: data.get("description"),
          contactEmail: data.get("contactEmail"),
          contactPhone: data.get("contactPhone") || undefined,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setStatus({ text: payload?.error?.message ?? "The request could not be sent.", tone: "is-error" });
        return;
      }
      setStatus({ text: payload.message ?? "Request received.", tone: "is-ok" });
      form.reset();
    } catch {
      setStatus({ text: "No connection to the server. Please try again.", tone: "is-error" });
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <button type="button" className="lp-btn primary" onClick={() => setOpen(true)}>
        Describe toolkit ↗
      </button>

      {open && (
        <div className="lp-modal" role="dialog" aria-modal="true" aria-labelledby="lp-toolkit-title">
          <button
            type="button"
            className="lp-modal-backdrop"
            aria-label="Close form"
            onClick={() => setOpen(false)}
          />
          <div className="lp-modal-panel">
            <div className="lp-modal-head">
              <div>
                <div className="lp-eyebrow">Custom request</div>
                <h3 id="lp-toolkit-title">Describe your toolkit</h3>
              </div>
              <button type="button" className="lp-modal-close" onClick={() => setOpen(false)} aria-label="Close form">
                ×
              </button>
            </div>

            <form className="lp-form" onSubmit={submit}>
              <div className="lp-field full">
                <label htmlFor="lp-tool-title">Toolkit name</label>
                <input
                  ref={firstField}
                  id="lp-tool-title"
                  name="title"
                  type="text"
                  maxLength={160}
                  placeholder="e.g. VIP table reservations"
                  required
                />
              </div>

              <div className="lp-field full">
                <label htmlFor="lp-tool-description">What do you need?</label>
                <textarea
                  id="lp-tool-description"
                  name="description"
                  maxLength={4000}
                  placeholder="Describe the problem, how the tool should work and who will use it…"
                  required
                />
              </div>

              <div className="lp-field">
                <label htmlFor="lp-tool-phone">Phone / WhatsApp</label>
                <input id="lp-tool-phone" name="contactPhone" type="tel" maxLength={40} placeholder="+238 …" />
              </div>

              <div className="lp-field">
                <label htmlFor="lp-tool-email">Email</label>
                <input id="lp-tool-email" name="contactEmail" type="email" placeholder="you@email.com" required />
              </div>

              <p className="lp-field full lp-form-status">
                References and files: send the request from inside your account to attach PDFs or images — they are
                stored against your own library.
              </p>

              <div className="lp-form-actions">
                <span className={`lp-form-status ${status.tone}`} role="status">
                  {status.text}
                </span>
                <button className="lp-btn primary" type="submit" disabled={sending}>
                  {sending ? "Sending…" : "Send request ↗"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
