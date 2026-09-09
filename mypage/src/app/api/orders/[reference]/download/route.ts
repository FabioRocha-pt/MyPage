import { db } from "@/lib/db";
import { ApiError, handle } from "@/lib/api";
import { etagFor, exists, readStream } from "@/lib/storage";

/**
 * Digital delivery.
 *
 * Doc 04: "Produto digital fica privado antes da compra e disponível apenas ao
 * comprador autorizado depois da confirmação."
 *
 * Three conditions, all required:
 *   1. the order's payment is verified (order.digitalReleased);
 *   2. the requester proves ownership with the buyer email on the order;
 *   3. the item requested actually belongs to that order.
 */

interface Params {
  params: Promise<{ reference: string }>;
}

export const GET = handle(async (request: Request, { params }: Params) => {
  const { reference } = await params;
  const url = new URL(request.url);
  const itemId = url.searchParams.get("item");
  const email = url.searchParams.get("email")?.trim().toLowerCase();

  const order = await db.order.findUnique({
    where: { reference: reference.toUpperCase() },
    include: { items: true },
  });
  if (!order) throw new ApiError("Encomenda não encontrada.", 404, "not_found");

  if (!order.digitalReleased || order.status !== "paid") {
    throw new ApiError(
      "Esta encomenda ainda não tem um pagamento confirmado. O ficheiro fica disponível assim que o pagamento for validado.",
      402,
      "payment_required",
    );
  }

  if (!email || email !== order.buyerEmail) {
    throw new ApiError(
      "Indica o email usado na compra para descarregar o ficheiro.",
      401,
      "email_required",
    );
  }

  const item = order.items.find((row) => row.id === itemId);
  if (!item || item.typeSnapshot !== "digital" || !item.assetMediaId) {
    throw new ApiError("Item não encontrado nesta encomenda.", 404, "not_found");
  }

  const media = await db.media.findUnique({ where: { id: item.assetMediaId } });
  if (!media?.originalKey || !(await exists(media.originalKey))) {
    throw new ApiError("Ficheiro indisponível. Contacta o artista.", 410, "gone");
  }

  return new Response(readStream(media.originalKey), {
    headers: {
      "Content-Type": media.mimeType,
      ETag: etagFor(media.originalKey),
      "Cache-Control": "private, max-age=0, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(media.title)}"`,
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
});
