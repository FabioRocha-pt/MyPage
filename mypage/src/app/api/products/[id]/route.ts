import { db } from "@/lib/db";
import { requireArtistAccess } from "@/lib/auth";
import { ApiError, handle, ok, optionalInt, optionalString, readJson } from "@/lib/api";

interface Params {
  params: Promise<{ id: string }>;
}

async function loadOwned(id: string) {
  const product = await db.product.findUnique({ where: { id }, include: { variants: true } });
  if (!product) throw new ApiError("Produto não encontrado.", 404, "not_found");
  await requireArtistAccess(product.artistId, { write: true });
  return product;
}

export const PATCH = handle(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const product = await loadOwned(id);
  const body = await readJson(request);

  const data: Record<string, unknown> = {};
  if (typeof body.title === "string" && body.title.trim()) data.title = body.title.trim().slice(0, 160);
  if (typeof body.description === "string") data.description = body.description.trim().slice(0, 4000);
  if (body.isPublished !== undefined) data.isPublished = body.isPublished === true;
  if (body.shippingInfo !== undefined) data.shippingInfo = optionalString(body, "shippingInfo", 500);
  if (body.shippingMinor !== undefined) {
    data.shippingMinor = optionalInt(body, "shippingMinor", { min: 0, max: 1_000_000_00 });
  }

  if (data.isPublished === true && product.type === "physical") {
    const sellable = product.variants.some((variant) => (variant.stock ?? 0) > 0);
    if (!sellable) {
      throw new ApiError(
        "Não é possível publicar um produto físico sem stock em nenhuma variante.",
        409,
        "no_stock",
      );
    }
  }

  // Variant updates are applied individually so a partial payload cannot wipe
  // stock levels that another request has just changed.
  if (Array.isArray(body.variants)) {
    for (const entry of body.variants) {
      const variant = (entry ?? {}) as Record<string, unknown>;
      if (typeof variant.id !== "string") continue;
      const owned = product.variants.find((v) => v.id === variant.id);
      if (!owned) continue;

      const variantData: Record<string, unknown> = {};
      if (typeof variant.name === "string" && variant.name.trim()) {
        variantData.name = variant.name.trim().slice(0, 60);
      }
      if (variant.priceMinor !== undefined) {
        variantData.priceMinor = optionalInt(variant, "priceMinor", { min: 0, max: 1_000_000_00 });
      }
      if (variant.stock !== undefined && product.type === "physical") {
        variantData.stock = optionalInt(variant, "stock", { min: 0, max: 1_000_000 });
      }
      if (Object.keys(variantData).length) {
        await db.productVariant.update({ where: { id: variant.id }, data: variantData });
      }
    }
  }

  const updated = await db.product.update({ where: { id }, data, include: { variants: true } });
  return ok({ id: updated.id, isPublished: updated.isPublished });
});

export const DELETE = handle(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  const product = await loadOwned(id);

  const soldCount = await db.orderItem.count({ where: { productId: id } });
  if (soldCount > 0) {
    // Unpublish instead of deleting: order history must keep its references.
    await db.product.update({ where: { id }, data: { isPublished: false } });
    return ok({
      deleted: false,
      unpublished: true,
      message: "O produto tem encomendas associadas, por isso foi despublicado em vez de apagado.",
    });
  }

  await db.product.delete({ where: { id: product.id } });
  return ok({ deleted: true });
});
