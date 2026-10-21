import type { Metadata } from "next";
import { StoreManager, type OrderRow, type ProductRow } from "@/components/studio/StoreManager";
import { load } from "@/lib/data";

export const metadata: Metadata = { title: "Merchandising" };

export default async function StorePage() {
  const {
    context: { artist, entitlement },
    rows: [products, orders, privateFiles, images],
  } = await load.studioStore();

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
