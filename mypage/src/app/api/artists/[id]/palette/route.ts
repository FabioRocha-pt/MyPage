import { db } from "@/lib/db";
import { requireArtistAccess } from "@/lib/auth";
import { ApiError, handle, ok, readJson, requireString } from "@/lib/api";
import { contrastRatio, evaluatePalette, extractPalette, relativeLuminance, textOn } from "@/lib/colors";
import { paletteSample } from "@/lib/storage";
import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Extracts a palette from a library image.
 *
 * The prototype did this in a canvas in the browser; running it on the server
 * means the same result regardless of device, and it works for images the
 * browser never downloaded.
 */

interface Params {
  params: Promise<{ id: string }>;
}

export const POST = handle(async (request: Request, { params }: Params) => {
  const { id } = await params;
  await requireArtistAccess(id);

  const body = await readJson(request);
  const mediaId = requireString(body, "mediaId", { max: 40 });

  const media = await db.media.findFirst({
    where: { id: mediaId, artistId: id, kind: "image" },
    select: { originalKey: true, derivedKey: true },
  });
  if (!media) throw new ApiError("Imagem não encontrada.", 404, "not_found");

  const key = media.derivedKey ?? media.originalKey;
  if (!key) throw new ApiError("Esta imagem não tem ficheiro associado.", 409, "no_file");

  const root = path.resolve(process.cwd(), process.env.STORAGE_DIR ?? "./storage");
  const buffer = await readFile(path.resolve(root, key)).catch(() => null);
  if (!buffer) throw new ApiError("Ficheiro indisponível.", 410, "gone");

  const pixels = await paletteSample(buffer);
  if (!pixels) throw new ApiError("Não foi possível ler esta imagem.", 422, "unreadable_image");

  const colors = extractPalette(pixels, 6);

  // For each extracted colour, propose a complete palette that already passes
  // the contrast rules — the artist picks a look, not a lottery ticket.
  const suggestions = colors.map((accent) => {
    const dark = "#101724";
    const light = "#faf8f4";
    const background = contrastRatio(accent, dark) >= 3 ? dark : light;
    return {
      accent,
      background,
      text: textOn(background),
      luminance: Math.round(relativeLuminance(accent) * 1000) / 1000,
      report: evaluatePalette({ background, text: textOn(background), accent }),
    };
  });

  return ok({
    colors,
    suggestions: suggestions.filter((s) => s.report.valid),
    rejected: suggestions.filter((s) => !s.report.valid).map((s) => s.accent),
  });
});
