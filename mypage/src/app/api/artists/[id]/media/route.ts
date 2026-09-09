import { db } from "@/lib/db";
import { requireArtistAccess } from "@/lib/auth";
import {
  ApiError,
  handle,
  ok,
  paged,
  pagination,
  readJson,
  requireEnum,
  requireString,
} from "@/lib/api";
import { assertMediaQuota } from "@/lib/entitlements";
import { detectPlatform, normaliseUrl, resolveEmbed } from "@/lib/platforms";
import {
  ALLOWED_TYPES,
  MAX_UPLOAD_BYTES,
  imageMeta,
  makeImageDerivative,
  makeKey,
  put,
  remove,
  sniff,
} from "@/lib/storage";

/**
 * Doc 03: "Biblioteca | Upload autorizado, completar processamento, listar,
 * editar visibilidade, download autorizado."
 */

interface Params {
  params: Promise<{ id: string }>;
}

export const GET = handle(async (request: Request, { params }: Params) => {
  const { id } = await params;
  await requireArtistAccess(id);

  const url = new URL(request.url);
  const kind = url.searchParams.get("kind");
  const albumId = url.searchParams.get("albumId");
  const page = pagination(request, { defaultPerPage: 48 });

  const where = {
    artistId: id,
    ...(kind ? { kind } : {}),
    ...(albumId ? { albumId } : {}),
  };

  const [items, total] = await Promise.all([
    db.media.findMany({
      where,
      orderBy: [{ position: "asc" }, { createdAt: "desc" }],
      take: page.take,
      skip: page.skip,
    }),
    db.media.count({ where }),
  ]);

  return ok(
    paged(
      items.map((item) => ({
        id: item.id,
        title: item.title,
        kind: item.kind,
        mimeType: item.mimeType,
        albumId: item.albumId,
        sizeBytes: item.sizeBytes,
        derivedBytes: item.derivedBytes,
        width: item.width,
        height: item.height,
        status: item.status,
        isPublic: item.isPublic,
        placement: item.placement,
        platform: item.platform,
        externalUrl: item.externalUrl,
        hasOriginal: Boolean(item.originalKey),
        viewUrl: `/api/media/${item.id}/view`,
        downloadUrl: item.originalKey ? `/api/media/${item.id}/download` : null,
        createdAt: item.createdAt.toISOString(),
      })),
      total,
      page,
    ),
  );
});

/**
 * Upload (multipart) or external-link registration (JSON).
 *
 * Doc 03: "Validar conteúdo/tamanho dos uploads no servidor". Validation order
 * matters: size, then magic bytes, then quota, then write. Nothing reaches disk
 * before the content type is proven from the bytes themselves.
 */
export const POST = handle(async (request: Request, { params }: Params) => {
  const { id } = await params;
  await requireArtistAccess(id, { write: true });

  const contentType = request.headers.get("content-type") ?? "";

  // --- External link ---------------------------------------------------------

  if (contentType.includes("application/json")) {
    const body = await readJson(request);
    const title = requireString(body, "title", { max: 160 });
    const rawUrl = requireString(body, "url", { max: 2000 });
    const kind = requireEnum(body, "kind", ["audio", "video"] as const);

    const url = normaliseUrl(rawUrl);
    if (!url) throw new ApiError("Usa um link http(s) válido.", 400, "invalid_url");

    const platform = detectPlatform(url);
    if (kind === "video" && !resolveEmbed(url)) {
      throw new ApiError(
        "Para vídeos, usa um link do YouTube ou do Vimeo que possa ser incorporado.",
        400,
        "unsupported_platform",
      );
    }

    const media = await db.media.create({
      data: {
        artistId: id,
        title,
        kind,
        mimeType: "text/uri-list",
        externalUrl: url,
        platform: platform?.id ?? "other",
        status: "ready",
        isPublic: true,
      },
    });

    return ok({ id: media.id, title: media.title, kind: media.kind }, { status: 201 });
  }

  // --- File upload -----------------------------------------------------------

  if (!contentType.includes("multipart/form-data")) {
    throw new ApiError("Envia um ficheiro (multipart) ou um link (JSON).", 415, "unsupported_media_type");
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw new ApiError("Ficheiro em falta.", 400, "missing_file");

  if (file.size === 0) throw new ApiError("O ficheiro está vazio.", 400, "empty_file");
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new ApiError(
      `Limite de ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB por ficheiro.`,
      413,
      "file_too_large",
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // The declared type is only a hint; the signature decides.
  const detected = sniff(buffer, file.type);
  if (!detected) {
    throw new ApiError(
      `Formato não suportado. Aceites: ${[...new Set(Object.values(ALLOWED_TYPES).map((t) => t.ext))].join(", ")}.`,
      415,
      "unsupported_file_type",
    );
  }

  await assertMediaQuota(id, buffer.length);

  const albumIdRaw = form.get("albumId");
  let albumId: string | null = null;
  if (typeof albumIdRaw === "string" && albumIdRaw) {
    const album = await db.album.findFirst({ where: { id: albumIdRaw, artistId: id }, select: { id: true } });
    if (!album) throw new ApiError("Álbum não encontrado.", 404, "album_not_found");
    albumId = album.id;
  }

  const originalKey = makeKey(id, detected.ext);
  await put(originalKey, buffer);

  let derivedKey: string | null = null;
  let derivedBytes: number | null = null;
  let width: number | null = null;
  let height: number | null = null;

  if (detected.kind === "image") {
    const meta = await imageMeta(buffer);
    width = meta?.width ?? null;
    height = meta?.height ?? null;
    const derivative = await makeImageDerivative(buffer, id);
    if (derivative) {
      derivedKey = derivative.key;
      derivedBytes = derivative.bytes;
    }
  }

  const titleRaw = form.get("title");
  const title = typeof titleRaw === "string" && titleRaw.trim() ? titleRaw.trim().slice(0, 160) : file.name.slice(0, 160);

  try {
    const media = await db.media.create({
      data: {
        artistId: id,
        albumId,
        title,
        kind: detected.kind,
        mimeType: detected.mime,
        originalKey,
        derivedKey,
        sizeBytes: buffer.length,
        derivedBytes,
        width,
        height,
        status: "ready",
        isPublic: false,
      },
    });

    return ok(
      {
        id: media.id,
        title: media.title,
        kind: media.kind,
        sizeBytes: media.sizeBytes,
        derivedBytes: media.derivedBytes,
        viewUrl: `/api/media/${media.id}/view`,
      },
      { status: 201 },
    );
  } catch (error) {
    // Never leave an orphaned blob behind when the metadata write fails.
    await remove(originalKey);
    await remove(derivedKey);
    throw error;
  }
});
