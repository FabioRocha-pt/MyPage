import type { Metadata } from "next";
import { StoreManager, type OrderRow, type ProductRow } from "@/components/studio/StoreManager";
import { db } from "@/lib/db";
import { requireStudioContext } from "@/lib/studio";

export const metadata: Metadata = { title: "Merchandising" };

export default async function StorePage() {
  const { artist, entitlement } = await requireStudioContext();

  const [products, orders, privateFiles, images] = await Promise.all([
    db.product.findMany({
      where: { artistId: artist.id },
      orderBy: { createdAt: "desc" },
      include: { variants: { orderBy: { position: "asc" } } },
    }),
    db.order.findMany({
      where: { artistId: artist.id },
      orderBy: { createdAt: "desc" },
      take: 40,
      include: { items: true, payment: { select: { status: true } } },
    }),
    // Doc 04: a digital product must be private before it can be sold.
    db.media.findMany({
      where: { artistId: artist.id, isPublic: false, NOT: { originalKey: null } },
      select: { id: true, title: true },
      take: 200,
    }),
    db.media.findMany({
      where: { artistId: artist.id, kind: "image", status: "ready" },
      select: { id: true, title: true },
      take: 200,
    }),
  ]);

  const productRows: ProductRow[] = products.map((product) => ({
    id: product.id,
    title: product.title,
    type: product.type,
    currency: product.currency,
    isPublished: product.isPublished,
    variants: product.variants.map((variant) => ({
      id: variant.id,
      name: variant.name,
      priceMinor: variant.priceMinor,
      stock: variant.stock,
    })),
  }));

  const orderRows: OrderRow[] = orders.map((order) => ({
    reference: order.reference,
    status: order.status,
    paymentStatus: order.payment?.status ?? "created",
    buyerName: order.buyerName,
    buyerEmail: order.buyerEmail,
    totalMinor: order.totalMinor,
    currency: order.currency,
    digitalReleased: order.digitalReleased,
    createdAt: order.createdAt.toISOString(),
    items: order.items.map((item) => ({
      title: item.titleSnapshot,
      variant: item.variantSnapshot,
      quantity: item.quantity,
      lineTotalMinor: item.lineTotalMinor,
    })),
  }));

  return (
    <StoreManager
      artistId={artist.id}
      initialProducts={productRows}
      initialOrders={orderRows}
      privateFiles={privateFiles}
      images={images}
      included={entitlement.tools.includes("store")}
      planLabel={entitlement.label}
      maxProducts={entitlement.maxProducts}
      paymentsLive={(process.env.PAYMENT_PROVIDER ?? "mock") === "sisp"}
    />
  );
}
