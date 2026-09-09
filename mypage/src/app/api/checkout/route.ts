import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import {
  ApiError,
  clientKey,
  handle,
  ok,
  optionalString,
  rateLimit,
  readJson,
  requireString,
} from "@/lib/api";
import { lineTotal } from "@/lib/money";
import { getProvider, idempotencyKey } from "@/lib/payments";

/**
 * PUBLIC multi-product checkout.
 *
 * Doc 04, etapa 6 acceptance criteria addressed here:
 *   - "Preço/total calculados no servidor e moeda explícita."
 *     Nothing from the request body contributes to the total: only productId,
 *     variantId and quantity are read. Prices come from the database.
 *   - "Compra concorrente não vende stock inexistente."
 *     Stock is decremented inside a transaction with a conditional update
 *     (`stock >= quantity`); a losing racer sees 0 rows affected and aborts.
 *   - "Produto físico exige dados de entrega e mostra portes/prazo/
 *      responsabilidade do artista antes da confirmação."
 *   - "Pagamento falhado/cancelado não entrega ficheiro nem confirma encomenda."
 *     The order is created as pending_payment; only a verified webhook advances
 *     it (see /api/payments/webhook).
 */

interface CartLine {
  productId: string;
  variantId: string;
  quantity: number;
}

function parseCart(input: unknown): CartLine[] {
  if (!Array.isArray(input) || input.length === 0) {
    throw new ApiError("O carrinho está vazio.", 400, "empty_cart");
  }
  if (input.length > 20) {
    throw new ApiError("Máximo de 20 linhas por encomenda.", 400, "cart_too_large");
  }

  const merged = new Map<string, CartLine>();
  for (const entry of input) {
    const line = (entry ?? {}) as Record<string, unknown>;
    const productId = typeof line.productId === "string" ? line.productId : "";
    const variantId = typeof line.variantId === "string" ? line.variantId : "";
    const quantity = Math.floor(Number(line.quantity ?? 1));
    if (!productId || !variantId) throw new ApiError("Linha de carrinho inválida.", 400, "invalid_line");
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 100) {
      throw new ApiError("Quantidade inválida.", 400, "invalid_quantity");
    }
    // Two lines for the same variant are one line; otherwise the stock check
    // below would validate each half separately and oversell.
    const existing = merged.get(variantId);
    merged.set(variantId, {
      productId,
      variantId,
      quantity: (existing?.quantity ?? 0) + quantity,
    });
  }
  return [...merged.values()];
}

export const POST = handle(async (request: Request) => {
  rateLimit(clientKey(request, "checkout"), 10, 10 * 60 * 1000);

  const body = await readJson(request);
  const slug = requireString(body, "slug", { max: 64 }).toLowerCase();
  const cart = parseCart(body.cart);

  const published = await db.publishedPage.findFirst({
    where: { slug, isLive: true },
    select: { artistId: true },
  });
  if (!published) throw new ApiError("Página não encontrada.", 404, "not_found");

  const buyerName = requireString(body, "buyerName", { max: 120 });
  const buyerEmail = requireString(body, "buyerEmail", { max: 200 }).toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(buyerEmail)) {
    throw new ApiError("Email inválido.", 400, "invalid_email");
  }

  // --- Load the real products -----------------------------------------------

  const variants = await db.productVariant.findMany({
    where: { id: { in: cart.map((line) => line.variantId) } },
    include: { product: true },
  });

  if (variants.length !== cart.length) {
    throw new ApiError("Um dos produtos já não está disponível.", 409, "product_unavailable");
  }

  for (const variant of variants) {
    if (variant.product.artistId !== published.artistId) {
      // Prevents mixing another artist's catalogue into this order.
      throw new ApiError("Produto não pertence a esta página.", 409, "product_mismatch");
    }
    if (!variant.product.isPublished) {
      throw new ApiError(`"${variant.product.title}" já não está à venda.`, 409, "product_unavailable");
    }
  }

  const currencies = new Set(variants.map((variant) => variant.product.currency));
  if (currencies.size > 1) {
    throw new ApiError("Não é possível misturar moedas na mesma encomenda.", 409, "mixed_currency");
  }
  const currency = [...currencies][0] ?? "CVE";

  const hasPhysical = variants.some((variant) => variant.product.type === "physical");

  // --- Delivery data ---------------------------------------------------------

  let addressLine: string | null = null;
  let addressCity: string | null = null;
  let addressCountry: string | null = null;
  let addressPostcode: string | null = null;

  if (hasPhysical) {
    addressLine = requireString(body, "addressLine", { max: 240 });
    addressCity = requireString(body, "addressCity", { max: 80 });
    addressCountry = requireString(body, "addressCountry", { max: 80 });
    addressPostcode = optionalString(body, "addressPostcode", 20);
  }

  // --- Server-computed totals ------------------------------------------------

  const byVariant = new Map(variants.map((variant) => [variant.id, variant]));
  let subtotalMinor = 0;
  const items = cart.map((line) => {
    const variant = byVariant.get(line.variantId)!;
    const total = lineTotal(variant.priceMinor, line.quantity);
    subtotalMinor += total;
    return {
      productId: variant.productId,
      variantId: variant.id,
      titleSnapshot: variant.product.title,
      variantSnapshot: variant.name,
      typeSnapshot: variant.product.type,
      priceMinor: variant.priceMinor,
      quantity: line.quantity,
      lineTotalMinor: total,
      assetMediaId: variant.product.assetMediaId,
    };
  });

  // Shipping is charged once per distinct physical product, using that
  // product's own rate.
  const shippingMinor = [
    ...new Set(variants.filter((v) => v.product.type === "physical").map((v) => v.productId)),
  ].reduce((total, productId) => {
    const variant = variants.find((v) => v.productId === productId)!;
    return total + (variant.product.shippingMinor ?? 0);
  }, 0);

  const totalMinor = subtotalMinor + shippingMinor;
  if (totalMinor <= 0) {
    throw new ApiError("Total inválido.", 409, "invalid_total");
  }

  // --- Transactional stock reservation --------------------------------------

  const reference = `ORD-${randomBytes(5).toString("hex").toUpperCase()}`;

  const order = await db.$transaction(async (tx) => {
    for (const line of cart) {
      const variant = byVariant.get(line.variantId)!;
      if (variant.product.type !== "physical" || variant.stock === null) continue;

      // Conditional decrement. Two concurrent buyers both pass the earlier read
      // but only one satisfies `stock: { gte: quantity }` at write time.
      const claimed = await tx.productVariant.updateMany({
        where: { id: variant.id, stock: { gte: line.quantity } },
        data: { stock: { decrement: line.quantity } },
      });
      if (claimed.count === 0) {
        throw new ApiError(
          `Stock insuficiente para "${variant.product.title} · ${variant.name}".`,
          409,
          "insufficient_stock",
          { variantId: variant.id },
        );
      }
    }

    return tx.order.create({
      data: {
        artistId: published.artistId,
        reference,
        buyerName,
        buyerEmail,
        buyerPhone: optionalString(body, "buyerPhone", 40),
        addressLine,
        addressCity,
        addressCountry,
        addressPostcode,
        deliveryNote: optionalString(body, "deliveryNote", 500),
        subtotalMinor,
        shippingMinor,
        totalMinor,
        currency,
        status: "pending_payment",
        items: { create: items },
      },
      include: { items: true },
    });
  });

  // --- Payment intent --------------------------------------------------------

  const provider = getProvider();
  const returnUrl = `/orders/${order.reference}`;

  try {
    const intent = await provider.createIntent({
      amountMinor: totalMinor,
      currency,
      purpose: "order",
      idempotencyKey: idempotencyKey("order", order.id),
      description: `Encomenda ${order.reference}`,
      returnUrl,
    });

    await db.order.update({ where: { id: order.id }, data: { paymentId: intent.paymentId } });

    return ok(
      {
        reference: order.reference,
        totalMinor,
        subtotalMinor,
        shippingMinor,
        currency,
        redirectUrl: intent.redirectUrl,
        statusUrl: `/api/orders/${order.reference}`,
        notice: hasPhysical
          ? "A entrega de produtos físicos é da responsabilidade do artista. A encomenda só é confirmada após pagamento validado."
          : "O ficheiro digital fica disponível apenas após o pagamento ser validado.",
      },
      { status: 201 },
    );
  } catch (error) {
    // Releasing the reservation matters: a provider outage must not silently
    // consume stock that was never paid for.
    await db.$transaction(async (tx) => {
      for (const line of cart) {
        const variant = byVariant.get(line.variantId)!;
        if (variant.product.type !== "physical" || variant.stock === null) continue;
        await tx.productVariant.update({
          where: { id: variant.id },
          data: { stock: { increment: line.quantity } },
        });
      }
      await tx.order.update({ where: { id: order.id }, data: { status: "failed" } });
    });
    throw error;
  }
});
