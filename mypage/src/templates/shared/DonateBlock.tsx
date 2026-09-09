"use client";

import { useState } from "react";
import type { SnapshotCampaign } from "@/lib/page-model";
import { formatMoney, toMinor, type CurrencyCode } from "@/lib/money";
import { Embed } from "./Embed";

/**
 * Donation campaign.
 *
 * Doc 02: "Front pretendido: vídeo, pedido, barra de progresso e doadores que
 * escolhem anonimato ou nome público. Progresso deve contar apenas pagamentos
 * confirmados."
 *
 * `raisedMinor` in the snapshot is already the confirmed-only total, computed
 * server-side, so the bar cannot be inflated by pending intents.
 */
export function DonateBlock({ campaign }: { campaign: SnapshotCampaign }) {
  const [amount, setAmount] = useState("500");
  const [anonymous, setAnonymous] = useState(true);
  const [state, setState] = useState<"idle" | "sending">("idle");
  const [error, setError] = useState<string | null>(null);

  const currency = campaign.currency as CurrencyCode;
  const progress = campaign.goalMinor > 0
    ? Math.min(100, Math.round((campaign.raisedMinor / campaign.goalMinor) * 100))
    : 0;

  async function donate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const amountMinor = toMinor(amount, currency);
    if (amountMinor === null || amountMinor <= 0) {
      setError("Indica um valor válido.");
      return;
    }

    setState("sending");
    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/donations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: campaign.id,
          amountMinor,
          isAnonymous: anonymous,
          displayName: anonymous ? undefined : form.get("displayName"),
          donorEmail: form.get("donorEmail") || undefined,
          message: form.get("message") || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error?.message ?? "Não foi possível iniciar o donativo.");
      window.location.href = data.redirectUrl;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Erro inesperado.");
      setState("idle");
    }
  }

  return (
    <div className="tpl-donate">
      {campaign.videoEmbed && (
        <Embed
          src={campaign.videoEmbed.src}
          title={`Vídeo da campanha ${campaign.title}`}
          ratio={campaign.videoEmbed.ratio}
          height={campaign.videoEmbed.height}
        />
      )}

      <div className="tpl-donate-body">
        <h3>{campaign.title}</h3>
        <p>{campaign.description}</p>

        <div className="tpl-progress">
          <div
            className="tpl-progress-bar"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${progress}% do objetivo`}
          >
            <span style={{ width: `${progress}%` }} />
          </div>
          <div className="tpl-progress-meta">
            <strong>{formatMoney(campaign.raisedMinor, currency)}</strong>
            <span>de {formatMoney(campaign.goalMinor, currency)} · {progress}%</span>
          </div>
          <small>Apenas pagamentos confirmados contam para este progresso.</small>
        </div>

        <form className="tpl-form" onSubmit={donate}>
          <div className="tpl-donate-amounts">
            {["500", "1000", "2500", "5000"].map((preset) => (
              <button
                key={preset}
                type="button"
                className={amount === preset ? "is-active" : ""}
                onClick={() => setAmount(preset)}
              >
                {formatMoney(toMinor(preset, currency) ?? 0, currency)}
              </button>
            ))}
          </div>

          <div className="tpl-form-grid">
            <label>
              <span>Valor ({currency}) *</span>
              <input
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                inputMode="decimal"
                required
              />
            </label>
            <label>
              <span>Email (recibo)</span>
              <input name="donorEmail" type="email" maxLength={200} autoComplete="email" />
            </label>
            <label className="tpl-form-full tpl-checkbox">
              <input
                type="checkbox"
                checked={anonymous}
                onChange={(event) => setAnonymous(event.target.checked)}
              />
              <span>Doar anonimamente</span>
            </label>
            {!anonymous && (
              <label className="tpl-form-full">
                <span>Nome a mostrar *</span>
                <input name="displayName" required maxLength={80} />
              </label>
            )}
            <label className="tpl-form-full">
              <span>Mensagem</span>
              <textarea name="message" rows={2} maxLength={500} />
            </label>
          </div>

          {error && (
            <p className="tpl-form-error" role="alert">
              {error}
            </p>
          )}

          <div className="tpl-form-actions">
            <button className="tpl-cta" type="submit" disabled={state === "sending"}>
              {state === "sending" ? "A preparar…" : "Apoiar"}
            </button>
          </div>
        </form>

        {campaign.donors.length > 0 && (
          <ul className="tpl-donors">
            {campaign.donors.map((donor, index) => (
              <li key={index}>
                <strong>{donor.name}</strong>
                <span>{formatMoney(donor.amountMinor, currency)}</span>
                {donor.message && <em>{donor.message}</em>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
