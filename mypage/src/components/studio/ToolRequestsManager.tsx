"use client";

import { useState } from "react";
import { getJson, postJson } from "@/lib/http";

/**
 * Tool requests from inside the backoffice.
 *
 * Doc 01: "Dentro do backoffice, não pedir novamente email/telefone: usar a
 * conta autenticada." The form has no contact fields, and the API ignores any
 * that were sent anyway when a session exists.
 *
 * Doc 02: "Receção interna, confirmação, histórico e resposta ainda pendentes."
 * The history below shows the status and the team's reply when one exists — it
 * never fabricates a response.
 */

export interface ToolRequestRow {
  id: string;
  title: string;
  description: string;
  status: string;
  reply: string | null;
  createdAt: string;
}

const STATUS_LABEL: Record<string, string> = {
  new: "Recebido",
  reviewing: "Em análise",
  planned: "Planeado",
  declined: "Não avançou",
  done: "Concluído",
};

export function ToolRequestsManager({
  contactEmail,
  attachments,
  initialRequests,
  /** Inside the page editor the card already has a heading and a frame. */
  embedded = false,
}: {
  contactEmail: string;
  attachments: { id: string; title: string }[];
  initialRequests: ToolRequestRow[];
  embedded?: boolean;
}) {
  const [requests, setRequests] = useState(initialRequests);
  const [form, setForm] = useState({ title: "", description: "" });
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ text: string; bad?: boolean } | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setStatus(null);

    const result = await postJson<{ message: string }>("/api/tool-requests", {
      title: form.title,
      description: form.description,
      attachments: selected,
    });

    if (!result.ok) {
      setStatus({ text: result.error ?? "Não foi possível enviar.", bad: true });
    } else {
      setStatus({ text: result.data?.message ?? "Pedido registado." });
      setForm({ title: "", description: "" });
      setSelected([]);
      const refreshed = await getJson<{ items: ToolRequestRow[] }>("/api/tool-requests");
      if (refreshed.ok && refreshed.data) setRequests(refreshed.data.items);
    }
    setBusy(false);
  }

  return (
    <div className={embedded ? "" : "manager"}>
      {embedded ? (
        <p className="hint">
          Descreve o que precisas. Respondemos para {contactEmail} — o contacto vem da tua conta, por isso o
          formulário não o volta a pedir.
        </p>
      ) : (
        <div className="view-head">
          <div>
            <h2>Pedir uma ferramenta</h2>
            <p>Conta à equipa My Page o que precisas. Respondemos para {contactEmail}.</p>
          </div>
        </div>
      )}

      <form className={embedded ? "" : "manager-form"} onSubmit={submit}>
        <div className="fields">
          <label className="field wide">
            Nome da ferramenta
            <input
              type="text"
              maxLength={160}
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              required
            />
          </label>
          <label className="field wide">
            Descreve o problema e a solução que procuras
            <textarea
              rows={5}
              maxLength={4000}
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              required
            />
          </label>
        </div>

        {attachments.length > 0 && (
          <>
            <h3>Anexos da biblioteca</h3>
            <div className="catalog-selector">
              {attachments.slice(0, 20).map((file) => (
                <label key={file.id} className="field" style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <input
                    type="checkbox"
                    checked={selected.includes(file.id)}
                    onChange={(event) =>
                      setSelected((current) =>
                        event.target.checked
                          ? [...current, file.id].slice(0, 10)
                          : current.filter((id) => id !== file.id),
                      )
                    }
                  />
                  {file.title}
                </label>
              ))}
            </div>
            <p className="hint">Podes anexar até 10 ficheiros já existentes na tua biblioteca.</p>
          </>
        )}

        <button type="submit" className="primary" disabled={busy}>
          Enviar pedido
        </button>
        {status && (
          <p className="hint" role="status" style={status.bad ? { color: "var(--danger)" } : undefined}>
            {status.text}
          </p>
        )}
      </form>

      <h3>Histórico</h3>
      {requests.length === 0 ? (
        <div className="empty-library">Ainda não enviaste pedidos.</div>
      ) : (
        <ul className="activity-list">
          {requests.map((row) => (
            <li key={row.id}>
              {row.title}
              <small>
                {STATUS_LABEL[row.status] ?? row.status} ·{" "}
                {new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium" }).format(new Date(row.createdAt))}
              </small>
              {row.reply && <small>Resposta: {row.reply}</small>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
