import { db } from "@/lib/db";
import { requireArtistAccess } from "@/lib/auth";
import {
  ApiError,
  handle,
  ok,
  optionalEnum,
  optionalString,
  readJson,
  requireEnum,
  requireString,
} from "@/lib/api";
import { PLATFORMS, detectPlatform, getPlatform, normaliseUrl, resolveEmbed } from "@/lib/platforms";

/**
 * Social and music platform links.
 * Doc 02: "Fluxo desejado: escolher plataforma, colar link, identificar
 * tipo/metadados, mostrar logo oficial e integrar player onde permitido."
 * "Link pode aparecer no hero, só na secção de música ou em ambos."
 */

interface Params {
  params: Promise<{ id: string }>;
}

export const GET = handle(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  await requireArtistAccess(id);

  const links = await db.externalLink.findMany({
    where: { artistId: id },
    orderBy: [{ group: "asc" }, { position: "asc" }],
  });

  return ok({
    links: links.map((link) => {
      const platform = getPlatform(link.platform);
      const embed = resolveEmbed(link.url);
      return {
        id: link.id,
        platform: link.platform,
        platformLabel: platform?.label ?? link.platform,
        mark: platform?.mark ?? "··",
        label: link.label,
        url: link.url,
        group: link.group,
        placement: link.placement,
        position: link.position,
        embeddable: Boolean(embed),
      };
    }),
    platforms: PLATFORMS.map((p) => ({ id: p.id, label: p.label, mark: p.mark, group: p.group })),
  });
});

export const POST = handle(async (request: Request, { params }: Params) => {
  const { id } = await params;
  await requireArtistAccess(id, { write: true });

  const body = await readJson(request);
  const rawUrl = requireString(body, "url", { max: 2000 });
  const url = normaliseUrl(rawUrl);
  if (!url) throw new ApiError("Usa um link http(s) válido.", 400, "invalid_url");

  // Trust the detected platform over the declared one when they disagree: a
  // Spotify URL filed under "instagram" would render the wrong mark.
  const detected = detectPlatform(url);
  const declared = typeof body.platform === "string" ? getPlatform(body.platform) : undefined;
  const platform = detected ?? declared;
  if (!platform) {
    throw new ApiError(
      "Plataforma não reconhecida. Escolhe 'Website' ou 'Outra plataforma' para links genéricos.",
      400,
      "unknown_platform",
    );
  }

  const group = requireEnum(body, "group", ["social", "music"] as const);
  const placement = optionalEnum(body, "placement", ["hero", "section", "both"] as const, "section");
  const count = await db.externalLink.count({ where: { artistId: id, group } });

  const link = await db.externalLink.create({
    data: {
      artistId: id,
      platform: platform.id,
      label: optionalString(body, "label", 80),
      url,
      group,
      placement,
      position: count,
    },
  });

  return ok({ id: link.id, platform: link.platform, url: link.url }, { status: 201 });
});
