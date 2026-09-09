import { db } from "@/lib/db";
import { handle, ok } from "@/lib/api";
import { getProvider, recordEvent } from "@/lib/payments";
import { notify } from "@/lib/notify";

/**
 * Payment webhook. The ONLY place where money is believed.
 *
 * Doc 03: "Webhook de pagamento autenticado, idempotente e reconciliado; não
 * confiar em redirect de sucesso. Dinheiro e estados não são controlados por
 * JavaScript do cliente."
 *
 * Doc 04 acceptance:
 *   - "Callback/webhook repetido não duplica cobrança, doação ou stock."
 *     `recordEvent` writes the delivery id under a unique index; a duplicate
 *     returns false and this handler exits without touching anything.
 *   - "Pagamento falhado/cancelado não entrega ficheiro nem confirma encomenda."
 *     Only `payment.verified` releases goods.
 *   - "Produto digital … disponível apenas ao comprador autorizado depois da
 *      confirmação." digitalReleased flips here, never at checkout.
 */

export const POST = handle(async (request: Request) => {
  const provider = getProvider();
  // The raw body is required for signature verification — parsing first would
  // change the bytes and break the HMAC.
  const rawBody = await request.text();
  const signature = request.headers.get("x-payment-signature");

  const event = provider.verifyWebhook(rawBody, signature);

  const payment = await db.payment.findUnique({
    where: { provider_reference: { provider: provider.id, reference: event.reference } },
    include: { order: { include: { items: true } }, donation: true },
  });

  if (!payment) {
    // 200 on an unknown reference: retrying will not make it exist, and a 4xx
    // would keep the provider hammering the endpoint.
    return ok({ received: true, matched: false });
  }

  const isNew = await recordEvent(payment.id, event);
  if (!isNew) {
    return ok({ received: true, duplicate: true, status: payment.status });
  }

  // Amount reconciliation: a mismatch is never accepted silently.
  if (event.type === "payment.verified" && event.amountMinor !== payment.amountMinor) {
    await db.payment.update({
      where: { id: payment.id },
      data: {
        status: "failed",
        rawPayload: JSON.stringify({ reason: "amount_mismatch", expected: payment.amountMinor, received: event.amountMinor }),
      },
    });
    return ok({ received: true, reconciled: false, reason: "amount_mismatch" });
  }

  // A terminal payment does not go backwards.
  if (["verified", "refunded"].includes(payment.status) && event.type !== "payment.refunded") {
    return ok({ received: true, ignored: true, status: payment.status });
  }

  switch (event.type) {
    case "payment.verified":
      await handleVerified(payment.id);
      break;
    case "payment.failed":
    case "payment.cancelled":
      await handleUnsuccessful(payment.id, event.type === "payment.failed" ? "failed" : "cancelled");
      break;
    case "payment.refunded":
      await handleRefunded(payment.id);
      break;
  }

  return ok({ received: true, processed: event.type });
});

async function handleVerified(paymentId: string) {
  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    include: { order: { include: { items: true } }, donation: true },
  });
  if (!payment) return;

  await db.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: paymentId },
      data: { status: "verified", verifiedAt: new Date() },
    });

    if (payment.order) {
      const hasDigital = payment.order.items.some((item) => item.typeSnapshot === "digital");
      await tx.order.update({
        where: { id: payment.order.id },
        data: {
          status: "paid",
          paidAt: new Date(),
          // Only now does the buyer gain access to the file.
          digitalReleased: hasDigital,
        },
      });
    }

    if (payment.donation) {
      await tx.donation.update({
        where: { id: payment.donation.id },
        data: { status: "confirmed", confirmedAt: new Date() },
      });
    }
  });

  if (payment.order) {
    await notify({
      artistId: payment.order.artistId,
      dedupeKey: `order.paid:${payment.order.id}`,
      type: "order.paid",
      title: "Encomenda paga",
      body: `${payment.order.reference} · ${payment.order.buyerName}.`,
      href: `/studio/store?order=${payment.order.reference}`,
    });
  }

  if (payment.donation) {
    const campaign = await db.campaign.findUnique({
      where: { id: payment.donation.campaignId },
      select: { artistId: true, title: true },
    });
    if (campaign) {
      await notify({
        artistId: campaign.artistId,
        dedupeKey: `donation.confirmed:${payment.donation.id}`,
        type: "donation.confirmed",
        title: "Novo donativo confirmado",
        body: `Campanha "${campaign.title}".`,
        href: "/studio/donations",
      });
    }
  }
}

async function handleUnsuccessful(paymentId: string, status: "failed" | "cancelled") {
  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    include: { order: { include: { items: true } }, donation: true },
  });
  if (!payment) return;

  await db.$transaction(async (tx) => {
    await tx.payment.update({ where: { id: paymentId }, data: { status } });

    if (payment.order) {
      // Return the reserved stock. Doing it here rather than on a timer means
      // an abandoned checkout frees inventory as soon as the provider says so.
      for (const item of payment.order.items) {
        if (item.typeSnapshot === "physical" && item.variantId) {
          await tx.productVariant.updateMany({
            where: { id: item.variantId, stock: { not: null } },
            data: { stock: { increment: item.quantity } },
          });
        }
      }
      await tx.order.update({
        where: { id: payment.order.id },
        data: { status: status === "failed" ? "failed" : "cancelled", digitalReleased: false },
      });
    }

    if (payment.donation) {
      await tx.donation.update({ where: { id: payment.donation.id }, data: { status: "failed" } });
    }
  });
}

async function handleRefunded(paymentId: string) {
  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    include: { order: { include: { items: true } }, donation: true },
  });
  if (!payment) return;

  await db.$transaction(async (tx) => {
    await tx.payment.update({ where: { id: paymentId }, data: { status: "refunded" } });

    if (payment.order) {
      for (const item of payment.order.items) {
        if (item.typeSnapshot === "physical" && item.variantId) {
          await tx.productVariant.updateMany({
            where: { id: item.variantId, stock: { not: null } },
            data: { stock: { increment: item.quantity } },
          });
        }
      }
      await tx.order.update({
        where: { id: payment.order.id },
        // Access to the digital file is withdrawn on refund.
        data: { status: "refunded", digitalReleased: false },
      });
    }

    if (payment.donation) {
      // Doc 02: "Progresso deve contar apenas pagamentos confirmados, com regra
      // clara para reembolsos." A refunded donation leaves the confirmed set,
      // so the progress bar drops accordingly.
      await tx.donation.update({ where: { id: payment.donation.id }, data: { status: "refunded" } });
    }
  });
}
