import { db } from "@/lib/db";
import { requireArtistAccess } from "@/lib/auth";
import { handle, ok, paged, pagination } from "@/lib/api";

/** Order management for the artist. Doc 04: "Gestão acompanha estados de
 *  encomenda, envio e casos de devolução/reembolso." */

interface Params {
  params: Promise<{ id: string }>;
}

export const GET = handle(async (request: Request, { params }: Params) => {
  const { id } = await params;
  await requireArtistAccess(id);

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const page = pagination(request, { defaultPerPage: 25 });
  const where = { artistId: id, ...(status ? { status } : {}) };

  const [orders, total] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: page.take,
      skip: page.skip,
      include: { items: true, payment: { select: { status: true, provider: true, reference: true } } },
    }),
    db.order.count({ where }),
  ]);

  return ok(
    paged(
      orders.map((order) => ({
        reference: order.reference,
        status: order.status,
        paymentStatus: order.payment?.status ?? "created",
        paymentProvider: order.payment?.provider ?? null,
        buyerName: order.buyerName,
        buyerEmail: order.buyerEmail,
        buyerPhone: order.buyerPhone,
        address: order.addressLine
          ? {
              line: order.addressLine,
              city: order.addressCity,
              country: order.addressCountry,
              postcode: order.addressPostcode,
              note: order.deliveryNote,
            }
          : null,
        currency: order.currency,
        subtotalMinor: order.subtotalMinor,
        shippingMinor: order.shippingMinor,
        totalMinor: order.totalMinor,
        digitalReleased: order.digitalReleased,
        createdAt: order.createdAt.toISOString(),
        paidAt: order.paidAt?.toISOString() ?? null,
        items: order.items.map((item) => ({
          title: item.titleSnapshot,
          variant: item.variantSnapshot,
          type: item.typeSnapshot,
          quantity: item.quantity,
          priceMinor: item.priceMinor,
          lineTotalMinor: item.lineTotalMinor,
        })),
      })),
      total,
      page,
    ),
  );
});
