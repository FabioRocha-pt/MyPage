"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { patchJson } from "@/lib/http";

/**
 * The team's tool-request queue.
 *
 * Doc 03: "Ferramentas | Criar pedido, listar acompanhamento, responder pela
 * equipa." The list is rendered on the server; this component owns only the
 * reply, so an open draft answer is never lost to a re-render of the page.
 */

export interface AdminToolRequest {
  id: string;
  title: string;
  description: string;
  status: string;
  reply: string | null;
  createdAt: string;
  /** Present when the request came from a signed-in artist. */
  accountEmail: string | null;
  artistName: string | null;
  /** Present only for anonymous landing-page requests (doc 01). */
  contactEmail: string | null;
  contactPhone: string | null;
}

const STATUSES = [
  { id: "new", label: "Novo" },
  { id: "reviewing", label: "Em análise" },
  { id: "answered", label: "Respondido" },
  { id: "planned", label: "Planeado" },
  { id: "declined", label: "Recusado" },
];

export function ToolRequestQueue({ requests }: { requests: AdminToolRequest[] }) {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);

  if (requests.length === 0) {
    return <div className="empty-library">Não há pedidos de ferramenta.</div>;
  }

  return (
    <div className="page-sections">
      {requests.map((request) => (
        <div className="editor-section" key={request.id}>
          <details
            className="accordion"
            open={open === request.id}
            onToggle={(event) => setOpen(event.currentTarget.open ? request.id : null)}
          >
            <summary>
              <span className="section-icon">{statusMark(request.status)}</span>
              <span>
                <b>{request.title}</b>
                <small>
                  {request.artistName ?? "Visitante anónimo"} ·{" "}
                  {new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium" }).format(new Date(request.createdAt))}
                </small>
              </span>
              <span className="chevron" aria-hidden="true">
                ⌄
              </span>
            </summary>
            <div className="section-body">
              <ReplyForm request={request} onSaved={() => router.refresh()} />
            </div>
          </details>
        </div>
      ))}
    </div>
  );
}

function ReplyForm({ request, onSaved }: { request: AdminToolRequest; onSaved: () => void }) {
  const [status, setStatus] = useState(request.status);
  const [reply, setReply] = useState(request.reply ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; tone: "" | "ok" | "error" } | null>(null);

  const unchanged = status === request.status && reply === (request.reply ?? "");

  async function save() {
    if (busy) return;
    setBusy(true);
    setMessage(null);

    const result = await patchJson<{ notifiedInApp: boolean; contactEmail: string | null }>(
      `/api/tool-requests/${request.id}`,
      { status, reply: reply.trim() || null },
    );

    if (!result.ok) {
      setMessage({ text: result.error ?? "Não foi possível guardar.", tone: "error" });
    } else {
      setMessage({
        text: result.data?.notifiedInApp
          ? "Guardado. O artista foi notificado no backoffice."
          : // An anonymous request has no account to notify: say so plainly
            // instead of implying the answer reached anyone.
            "Guardado. Este pedido não tem conta associada — responde pelo contacto indicado.",
        tone: "ok",
      });
      onSaved();
    }
    setBusy(false);
  }

  return (
    <>
      <p>{request.description}</p>

      <h3>Contacto</h3>
      <p className="hint">
        {request.accountEmail
          ? `Conta: ${request.accountEmail}`
          : `Sem conta · ${request.contactEmail ?? "sem email"}${
              request.contactPhone ? ` · ${request.contactPhone}` : ""
            }`}
      </p>

      <h3>Resposta da equipa</h3>
      <label>
        Estado
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          {STATUSES.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Resposta
        <textarea
          rows={5}
          value={reply}
          maxLength={4000}
          placeholder="O que a equipa quer comunicar ao artista."
          onChange={(event) => setReply(event.target.value)}
        />
      </label>

      <button type="button" className="primary" onClick={save} disabled={busy || unchanged}>
        {busy ? "A guardar…" : "Guardar resposta"}
      </button>

      {message && (
        <p role="status" style={message.tone === "error" ? { color: "var(--danger)" } : undefined}>
          {message.text}
        </p>
      )}
    </>
  );
}

function statusMark(status: string): string {
  if (status === "new") return "●";
  if (status === "answered" || status === "planned") return "✓";
  if (status === "declined") return "✕";
  return "◔";
}
