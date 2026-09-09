import { db } from "@/lib/db";
import { getAccount } from "@/lib/auth";
import { ApiError, handle, ok } from "@/lib/api";

/**
 * Order status.
 *
 * A buyer has no account, so the reference plus the buyer's email is the
 * credential. The reference alone reveals only the state, never the digital
 * asset — download requires the matching email (see ./download).
 */

interface Params {
  params: Promise<{ reference: string }>;
}

export const GET = handle(async (request: Request, { params }: Params) => {
  const { reference } = await params;

  const order = await db.order.findUnique({
    where: { reference: reference.toUpperCase() },
    include: { items: true, payment: true, artist: { select: { id: true, displayName: true, slug: true } } },
  });
  if (!order) throw new ApiError("Encomenda não encontrada.", 404, "not_found");

  // The artist sees everything; anyone else sees the buyer-facing summary.
  const account = await getAccount();
  const isManager = account
    ? Boolean(
        await db.membership.findUnique({
          where: { accountId_artistId: { accountId: account.id, artistId: order.artistId } },
          select: { id: true },
        }),
      )
    : false;

  return ok({
    reference: order.reference,
    status: order.status,
    paymentStatus: order.payment?.status ?? "created",
    currency: order.currency,
    subtotalMinor: order.subtotalMinor,
    shippingMinor: order.shippingMinor,
    totalMinor: order.totalMinor,
    createdAt: order.createdAt.toISOString(),
    paidAt: order.paidAt?.toISOString() ?? null,
    digitalReleased: order.digitalReleased,
    artist: { displayName: order.artist.displayName, slug: order.artist.slug },
    items: order.items.map((item) => ({
      title: item.titleSnapshot,
      variant: item.variantSnapshot,
      type: item.typeSnapshot,
      quantity: item.quantity,
      priceMinor: item.priceMinor,
      lineTotalMinor: item.lineTotalMinor,
      // The download link only appears once the payment is verified.
      downloadUrl:
        order.digitalReleased && item.typeSnapshot === "digital" && item.assetMediaId
          ? `/api/orders/${order.reference}/download?item=${item.id}`
          : null,
    })),
    ...(isManager
      ? {
          buyer: {
            name: order.buyerName,
            email: order.buyerEmail,
            phone: order.buyerPhone,
            address: order.addressLine
              ? {
                  line: order.addressLine,
                  city: order.addressCity,
                  country: order.addressCountry,
                  postcode: order.addressPostcode,
                  note: order.deliveryNote,
                }
              : null,
          },
        }
      : {}),
  });
});

/** Fulfilment transitions, artist-side. */
export const PATCH = handle(async (request: Request, { params }: Params) => {
  const { reference } = await params;
  const order = await db.order.findUnique({ where: { reference: reference.toUpperCase() } });
  if (!order) throw new ApiError("Encomenda não encontrada.", 404, "not_found");

  const account = await getAccount();
  const membership = account
    ? await db.membership.findUnique({
        where: { accountId_artistId: { accountId: account.id, artistId: order.artistId } },
        select: { role: true },
      })
    : null;
  if (!membership || membership.role === "viewer") {
    throw new ApiError("Encomenda não encontrada.", 404, "not_found");
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const status = String(body.status ?? "");

  const allowed: Record<string, string[]> = {
    paid: ["preparing", "cancelled"],
    preparing: ["shipped", "cancelled"],
    shipped: ["delivered"],
    delivered: [],
    pending_payment: ["cancelled"],
    cancelled: [],
    refunded: [],
    failed: [],
  };

  if (!allowed[order.status]?.includes(status)) {
    throw new ApiError(
      `Transição inválida: de "${order.status}" só é possível ir para ${(allowed[order.status] ?? []).join(", ") || "nenhum estado"}.`,
      409,
      "invalid_transition",
    );
  }

  // Refunds are a payment-provider action, never a local status flip: doing it
  // here would desynchronise the money from the record.
  const updated = await db.order.update({ where: { id: order.id }, data: { status } });
  return ok({ reference: updated.reference, status: updated.status });
});
