import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { ApiError, clientKey, handle, ok, rateLimit, readJson, requireEnum, requireString } from "@/lib/api";
import { getProvider, signPayload } from "@/lib/payments";

/**
 * Sandbox payment simulator.
 *
 * This is the stand-in for the SISP hosted payment page. It exists so the whole
 * commerce flow — intent, provider redirect, signed callback, verified state,
 * goods release — can be exercised end to end before SISP credentials arrive
 * (doc 03, item 4).
 *
 * It does not shortcut the trust model: it builds a payload, signs it with the
 * same HMAC secret a real provider would use, and posts it to the same webhook
 * handler. The application code path under test is identical.
 *
 * Refuses to run when a real provider is configured.
 */

export const POST = handle(async (request: Request) => {
  const provider = getProvider();
  if (provider.id !== "mock") {
    throw new ApiError("O simulador está desativado quando existe um provedor real.", 403, "forbidden");
  }
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_MOCK_PAYMENTS !== "1") {
    throw new ApiError("O simulador de pagamentos está desativado.", 403, "forbidden");
  }

  rateLimit(clientKey(request, "mockpay"), 30, 10 * 60 * 1000);

  const body = await readJson(request);
  const reference = requireString(body, "reference", { max: 64 });
  const outcome = requireEnum(body, "outcome", ["verified", "failed", "cancelled", "refunded"] as const);

  const payment = await db.payment.findUnique({
    where: { provider_reference: { provider: "mock", reference } },
  });
  if (!payment) throw new ApiError("Pagamento não encontrado.", 404, "not_found");

  const payload = JSON.stringify({
    eventKey: randomUUID(),
    reference,
    type: `payment.${outcome}`,
    amountMinor: payment.amountMinor,
    currency: payment.currency,
    simulated: true,
  });

  // Round-trip through the real webhook so signature verification, idempotency
  // and reconciliation all execute exactly as they would in production.
  const origin = new URL(request.url).origin;
  const response = await fetch(`${origin}/api/payments/webhook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-payment-signature": signPayload(payload),
    },
    body: payload,
  });

  const result = await response.json().catch(() => ({}));
  return ok({ simulated: outcome, webhook: result }, { status: response.ok ? 200 : 502 });
});
