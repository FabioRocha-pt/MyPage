"use client";

import { useState } from "react";
import { deleteJson, getJson, patchJson, postJson } from "@/lib/http";
import { DismissibleNotice } from "./DismissibleNotice";

/**
 * Donations.
 *
 * Doc 02: "Progresso deve contar apenas pagamentos confirmados, com regra clara
 * para reembolsos." The bar below therefore uses `raisedMinor`, which the API
 * builds from confirmed donations only; pending and refunded amounts are shown
 * separately so nothing implies money that has not arrived.
 *
 * Doc 02: "Nenhum contrato de API, credencial ou fluxo de liquidação foi
 * fornecido. (…) Não criar dados bancários fictícios nem afirmar que o dinheiro
 * foi recebido." The notice states exactly that while the provider is a mock.
 */

export interface CampaignRow {
  id: string;
  title: string;
  description: string;
  goalMinor: number;
  currency: string;
  videoUrl: string | null;
  status: string;
  isPublic: boolean;
  raisedMinor: number;
  pendingMinor: number;
  refundedMinor: number;
  donorCount: number;
}

interface Props {
  artistId: string;
  initialCampaigns: CampaignRow[];
  paymentsLive: boolean;
  included: boolean;
  planLabel: string;
}

const EMPTY = { title: "", description: "", goal: "", videoUrl: "", status: "draft" };

export function DonationsManager({ artistId, initialCampaigns, paymentsLive, included, planLabel }: Props) {
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ text: string; bad?: boolean } | null>(null);

  async function reload() {
    const result = await getJson<{ campaigns: CampaignRow[] }>(`/api/artists/${artistId}/campaigns`);
    if (result.ok && result.data) setCampaigns(result.data.campaigns);
  }

  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setStatus(null);

    // Amounts travel in minor units; the input is in escudos.
    const goalMinor = Math.round(Number(form.goal.replace(",", ".")) * 100);
    if (!Number.isSafeInteger(goalMinor) || goalMinor < 1) {
      setStatus({ text: "Indica um objetivo válido.", bad: true });
      setBusy(false);
      return;
    }

    const result = await postJson(`/api/artists/${artistId}/campaigns`, {
      title: form.title,
      description: form.description,
      goalMinor,
      currency: "CVE",
      videoUrl: form.videoUrl || null,
      status: form.status,
    });

    setStatus(result.ok ? { text: "Campanha criada." } : { text: result.error ?? "Erro.", bad: true });
    if (result.ok) setForm(EMPTY);
    await reload();
    setBusy(false);
  }

  async function setCampaignStatus(row: CampaignRow, next: string) {
    if (busy) return;
    setBusy(true);
    const result = await patchJson(`/api/campaigns/${row.id}`, { status: next });
    setStatus(result.ok ? { text: `${row.title}: ${next}.` } : { text: result.error ?? "Erro.", bad: true });
    await reload();
    setBusy(false);
  }

  async function remove(row: CampaignRow) {
    if (busy) return;
    setBusy(true);
    const result = await deleteJson(`/api/campaigns/${row.id}`);
    setStatus(result.ok ? { text: `${row.title} removida.` } : { text: result.error ?? "Erro.", bad: true });
    await reload();
    setBusy(false);
  }

  return (
    <div className="manager">
      {!paymentsLive && (
        <DismissibleNotice id="donations-provider">
          Não existe integração SISP ativa: o provedor em uso é de teste. Nenhum donativo aqui representa dinheiro
          recebido, e a barra de progresso conta apenas pagamentos marcados como confirmados.
        </DismissibleNotice>
      )}
      {!included && (
        <DismissibleNotice id="donations-plan">
          Os donativos não estão incluídos no plano {planLabel}. Podes preparar campanhas, mas a secção não é
          publicada.
        </DismissibleNotice>
      )}

      <div className="view-head">
        <div>
          <h2>Donativos</h2>
          <p>Campanhas, objetivo e progresso real. Na Page decides se a secção aparece.</p>
        </div>
      </div>

      <form className="manager-form" onSubmit={create}>
        <h3>Nova campanha</h3>
        <div className="fields">
          <label className="field">
            Título
            <input
              type="text"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              required
            />
          </label>
          <label className="field">
            Objetivo (ECV)
            <input
              type="text"
              inputMode="decimal"
              value={form.goal}
              onChange={(event) => setForm({ ...form, goal: event.target.value })}
              required
            />
          </label>
          <label className="field">
            Vídeo · YouTube ou Vimeo
            <input
              type="url"
              placeholder="https://"
              value={form.videoUrl}
              onChange={(event) => setForm({ ...form, videoUrl: event.target.value })}
            />
          </label>
          <label className="field">
            Estado
            <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
              <option value="draft">Rascunho</option>
              <option value="active">Ativa</option>
              <option value="paused">Em pausa</option>
              <option value="closed">Fechada</option>
            </select>
          </label>
          <label className="field wide">
            Motivo da campanha
            <textarea
              rows={4}
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              required
            />
          </label>
        </div>
        <button type="submit" className="primary" disabled={busy}>
          Criar campanha
        </button>
        {status && (
          <p className="hint" role="status" style={status.bad ? { color: "var(--danger)" } : undefined}>
            {status.text}
          </p>
        )}
      </form>

      <h3>Campanhas</h3>
      {campaigns.length === 0 ? (
        <div className="empty-library">Ainda não há campanhas.</div>
      ) : (
        <div className="record-grid">
          {campaigns.map((row) => {
            const percent = row.goalMinor > 0 ? Math.min(100, (row.raisedMinor / row.goalMinor) * 100) : 0;
            return (
              <article className="record-card" key={row.id}>
                <h4>{row.title}</h4>
                <small>Estado: {row.status}</small>
                <div
                  style={{
                    height: 8,
                    borderRadius: 10,
                    background: "var(--raised)",
                    overflow: "hidden",
                    margin: "14px 0",
                  }}
                >
                  <span style={{ display: "block", height: "100%", width: `${percent}%`, background: "var(--cyan)" }} />
                </div>
                <small>
                  {formatCve(row.raisedMinor)} confirmados de {formatCve(row.goalMinor)} · {row.donorCount} doadores
                </small>
                {row.pendingMinor > 0 && <small>{formatCve(row.pendingMinor)} por confirmar</small>}
                {row.refundedMinor > 0 && <small>{formatCve(row.refundedMinor)} reembolsados</small>}
                <div className="record-actions">
                  {row.status !== "active" && (
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => setCampaignStatus(row, "active")}
                      disabled={busy}
                    >
                      Ativar
                    </button>
                  )}
                  {row.status === "active" && (
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => setCampaignStatus(row, "paused")}
                      disabled={busy}
                    >
                      Pausar
                    </button>
                  )}
                  <button type="button" className="quiet" onClick={() => remove(row)} disabled={busy}>
                    Remover
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatCve(minor: number): string {
  return new Intl.NumberFormat("pt-CV", {
    style: "currency",
    currency: "CVE",
    maximumFractionDigits: 0,
  }).format(minor / 100);
}
