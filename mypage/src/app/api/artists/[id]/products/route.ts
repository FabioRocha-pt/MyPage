import { db } from "@/lib/db";
import { requireArtistAccess } from "@/lib/auth";
import {
  ApiError,
  handle,
  ok,
  optionalInt,
  optionalString,
  readJson,
  requireBool,
  requireEnum,
  requireString,
} from "@/lib/api";
import { assertProductQuota } from "@/lib/entitlements";
import { isCurrency } from "@/lib/money";
import { normaliseUrl } from "@/lib/platforms";

interface Params {
  params: Promise<{ id: string }>;
}

export const GET = handle(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  await requireArtistAccess(id);

  const products = await db.product.findMany({
    where: { artistId: id },
    include: { variants: { orderBy: { position: "asc" } } },
    orderBy: { createdAt: "desc" },
  });

  return ok({
    products: products.map((product) => ({
      id: product.id,
      title: product.title,
      description: product.description,
      type: product.type,
      currency: product.currency,
      imageMediaId: product.imageMediaId,
      imageUrl: product.imageUrl,
      shippingMinor: product.shippingMinor,
      shippingInfo: product.shippingInfo,
      assetMediaId: product.assetMediaId,
      isPublished: product.isPublished,
      variants: product.variants.map((variant) => ({
        id: variant.id,
        name: variant.name,
        priceMinor: variant.priceMinor,
        stock: variant.stock,
        sku: variant.sku,
      })),
    })),
  });
});

export const POST = handle(async (request: Request, { params }: Params) => {
  const { id } = await params;
  await requireArtistAccess(id, { write: true });
  await assertProductQuota(id);

  const body = await readJson(request);
  const title = requireString(body, "title", { max: 160 });
  const description = requireString(body, "description", { max: 4000 });
  const type = requireEnum(body, "type", ["digital", "physical"] as const);
  const currency = optionalString(body, "currency", 3) ?? "CVE";
  if (!isCurrency(currency)) throw new ApiError("Moeda não suportada.", 400, "invalid_currency");

  // Variants carry the price; a product without one cannot be bought.
  const rawVariants = Array.isArray(body.variants) ? body.variants : [];
  if (rawVariants.length === 0) {
    throw new ApiError("Adiciona pelo menos uma variante com preço.", 400, "missing_variants");
  }
  if (rawVariants.length > 40) {
    throw new ApiError("Máximo de 40 variantes por produto.", 400, "too_many_variants");
  }

  const variants = rawVariants.map((entry, index) => {
    const variant = (entry ?? {}) as Record<string, unknown>;
    const priceMinor = optionalInt(variant, "priceMinor", { min: 0, max: 1_000_000_00 });
    if (priceMinor === null) {
      throw new ApiError(`Preço em falta na variante ${index + 1}.`, 400, "missing_price");
    }
    // Digital goods are never stock managed; a null stock means unlimited.
    const stock = type === "digital" ? null : optionalInt(variant, "stock", { min: 0, max: 1_000_000 });
    return {
      name: (typeof variant.name === "string" && variant.name.trim() ? variant.name.trim() : "Padrão").slice(0, 60),
      priceMinor,
      stock,
      sku: typeof variant.sku === "string" ? variant.sku.trim().slice(0, 60) || null : null,
      position: index,
    };
  });

  let imageMediaId: string | null = null;
  if (typeof body.imageMediaId === "string" && body.imageMediaId) {
    const media = await db.media.findFirst({
      where: { id: body.imageMediaId, artistId: id, kind: "image" },
      select: { id: true },
    });
    if (!media) throw new ApiError("Imagem não encontrada.", 404, "media_not_found");
    imageMediaId = media.id;
  }

  let assetMediaId: string | null = null;
  if (type === "digital") {
    if (typeof body.assetMediaId !== "string" || !body.assetMediaId) {
      throw new ApiError("Um produto digital precisa de um ficheiro associado.", 400, "missing_asset");
    }
    const asset = await db.media.findFirst({
      where: { id: body.assetMediaId, artistId: id },
      select: { id: true, originalKey: true, isPublic: true },
    });
    if (!asset?.originalKey) throw new ApiError("Ficheiro digital não encontrado.", 404, "asset_not_found");
    if (asset.isPublic) {
      // Doc 04: "Produto digital fica privado antes da compra."
      throw new ApiError(
        "O ficheiro está público na biblioteca. Torna-o privado antes de o vender.",
        409,
        "asset_public",
      );
    }
    assetMediaId = asset.id;
  }

  const imageRaw = optionalString(body, "imageUrl", 2000);
  const imageUrl = imageRaw ? normaliseUrl(imageRaw) : null;
  if (imageRaw && !imageUrl) throw new ApiError("Link da imagem inválido.", 400, "invalid_url");

  const product = await db.product.create({
    data: {
      artistId: id,
      title,
      description,
      type,
      currency,
      imageMediaId,
      imageUrl,
      shippingMinor: type === "physical" ? optionalInt(body, "shippingMinor", { min: 0, max: 1_000_000_00 }) : null,
      shippingInfo: type === "physical" ? optionalString(body, "shippingInfo", 500) : null,
      assetMediaId,
      isPublished: requireBool(body, "isPublished", false),
      variants: { create: variants },
    },
    include: { variants: true },
  });

  return ok({ id: product.id, title: product.title, variants: product.variants.length }, { status: 201 });
});
