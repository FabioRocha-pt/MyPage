import { createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { db } from "./db";
import { ApiError } from "./api";

/**
 * Payment provider abstraction.
 *
 * Doc 03 item 4: "SISP: documentação, sandbox, conta/contrato e destinatário de
 * liquidação. Não colocar chaves nesta pasta." No SISP contract, credentials or
 * sandbox were provided, so a real SISP adapter cannot be written yet.
 *
 * What exists instead is a `mock` provider implementing the exact contract the
 * real one must satisfy, so swapping it is a matter of writing `createIntent`
 * and `verifySignature` against SISP's documentation:
 *
 *   - the intent (and therefore the amount) is created on the server;
 *   - the browser never reports success — only a verified webhook does;
 *   - webhook deliveries are authenticated with an HMAC signature;
 *   - repeated deliveries are recognised by `eventKey` and ignored;
 *   - goods are released solely on `status === "verified"`.
 *
 * Doc 04: "Callback/webhook repetido não duplica cobrança, doação ou stock."
 */

export type PaymentPurpose = "order" | "donation";

export interface PaymentIntent {
  paymentId: string;
  provider: string;
  reference: string;
  /** Where the buyer is sent to complete the payment. */
  redirectUrl: string;
  amountMinor: number;
  currency: string;
}

export interface PaymentProvider {
  readonly id: string;
  createIntent(input: {
    amountMinor: number;
    currency: string;
    purpose: PaymentPurpose;
    idempotencyKey: string;
    description: string;
    returnUrl: string;
  }): Promise<PaymentIntent>;
  /** Returns the parsed event when the signature is valid, otherwise throws. */
  verifyWebhook(rawBody: string, signature: string | null): WebhookEvent;
}

export interface WebhookEvent {
  /** Unique per delivery attempt group. Duplicate deliveries reuse it. */
  eventKey: string;
  reference: string;
  type: "payment.verified" | "payment.failed" | "payment.cancelled" | "payment.refunded";
  amountMinor: number;
  currency: string;
  raw: string;
}

function webhookSecret(): string {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  if (!secret) throw new Error("PAYMENT_WEBHOOK_SECRET não está definido.");
  return secret;
}

export function signPayload(rawBody: string): string {
  return createHmac("sha256", webhookSecret()).update(rawBody).digest("hex");
}

const mockProvider: PaymentProvider = {
  id: "mock",

  async createIntent({ amountMinor, currency, purpose, idempotencyKey, description, returnUrl }) {
    // Idempotency: the same key must always resolve to the same payment row, so
    // a double-clicked checkout cannot create two charges.
    const existing = await db.payment.findUnique({ where: { idempotencyKey } });
    if (existing) {
      return {
        paymentId: existing.id,
        provider: existing.provider,
        reference: existing.reference,
        redirectUrl: `/checkout/${existing.reference}?return=${encodeURIComponent(returnUrl)}`,
        amountMinor: existing.amountMinor,
        currency: existing.currency,
      };
    }

    const reference = `MP-${randomBytes(6).toString("hex").toUpperCase()}`;
    const payment = await db.payment.create({
      data: {
        provider: "mock",
        reference,
        idempotencyKey,
        amountMinor,
        currency,
        purpose,
        status: "pending",
        rawPayload: JSON.stringify({ description }),
      },
    });

    return {
      paymentId: payment.id,
      provider: "mock",
      reference,
      redirectUrl: `/checkout/${reference}?return=${encodeURIComponent(returnUrl)}`,
      amountMinor,
      currency,
    };
  },

  verifyWebhook(rawBody, signature) {
    if (!signature) {
      throw new ApiError("Assinatura do webhook em falta.", 401, "missing_signature");
    }
    const expected = signPayload(rawBody);
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    // Length check first: timingSafeEqual throws on mismatched lengths.
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new ApiError("Assinatura do webhook inválida.", 401, "invalid_signature");
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      throw new ApiError("Payload do webhook inválido.", 400, "invalid_payload");
    }

    const type = parsed.type;
    const reference = parsed.reference;
    const eventKey = parsed.eventKey ?? parsed.id;

    if (
      typeof reference !== "string" ||
      typeof eventKey !== "string" ||
      typeof type !== "string" ||
      !["payment.verified", "payment.failed", "payment.cancelled", "payment.refunded"].includes(type)
    ) {
      throw new ApiError("Evento de pagamento desconhecido.", 400, "unknown_event");
    }

    return {
      eventKey,
      reference,
      type: type as WebhookEvent["type"],
      amountMinor: Number(parsed.amountMinor ?? 0),
      currency: typeof parsed.currency === "string" ? parsed.currency : "CVE",
      raw: rawBody,
    };
  },
};

/**
 * The SISP slot. Left unimplemented on purpose: doc 03 forbids inventing
 * endpoints ("Não inferir endpoints a partir dos URLs públicos") and no
 * sandbox was provided.
 */
const sispProvider: PaymentProvider = {
  id: "sisp",
  async createIntent() {
    throw new ApiError(
      "A integração SISP ainda não está disponível. É necessária documentação, sandbox e conta de liquidação.",
      503,
      "provider_unavailable",
    );
  },
  verifyWebhook() {
    throw new ApiError("A integração SISP ainda não está disponível.", 503, "provider_unavailable");
  },
};

export function getProvider(id = process.env.PAYMENT_PROVIDER ?? "mock"): PaymentProvider {
  return id === "sisp" ? sispProvider : mockProvider;
}

/** Stable idempotency key for a given business operation. */
export function idempotencyKey(scope: string, ...parts: string[]): string {
  return `${scope}:${parts.join(":")}:${randomUUID()}`;
}

/**
 * Records a webhook delivery exactly once.
 * Returns false when the event has already been processed, in which case the
 * caller must do nothing and still answer 200 so the provider stops retrying.
 */
export async function recordEvent(paymentId: string, event: WebhookEvent): Promise<boolean> {
  try {
    await db.paymentEvent.create({
      data: {
        paymentId,
        eventKey: event.eventKey,
        type: event.type,
        payload: event.raw.slice(0, 20000),
      },
    });
    return true;
  } catch (error) {
    // Unique constraint on eventKey — a duplicate delivery.
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return false;
    }
    throw error;
  }
}
