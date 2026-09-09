import { db } from "@/lib/db";
import { requireArtistAccess } from "@/lib/auth";
import {
  ApiError,
  assertSlug,
  cleanText,
  handle,
  ok,
  optionalString,
  readJson,
  requireString,
} from "@/lib/api";
import { evaluatePalette, normaliseHex } from "@/lib/colors";
import { getArtistEntitlement } from "@/lib/entitlements";
import { normaliseEditorOrder, normaliseSections } from "@/lib/page-model";
import { readEditorOrder, readSections } from "@/lib/snapshot";

/**
 * Doc 03: "Ler/guardar rascunho | GET/PUT /artists/{id}/page/draft, controlo de
 * versão/conflito."
 *
 * Doc 03 also states: "Guardar não altera a página pública." Nothing in this
 * route touches PublishedPage.
 */

interface Params {
  params: Promise<{ id: string }>;
}

export const GET = handle(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  await requireArtistAccess(id);

  const artist = await db.artist.findUnique({
    where: { id },
    include: { draft: true },
  });
  if (!artist) throw new ApiError("Artista não encontrado.", 404, "not_found");

  const draft =
    artist.draft ??
    (await db.pageDraft.create({
      data: { artistId: id, editorOrder: "[]", sections: "[]" },
    }));

  const [entitlement, published] = await Promise.all([
    getArtistEntitlement(id),
    db.publishedPage.findFirst({
      where: { artistId: id, isLive: true },
      select: { version: true, publishedAt: true, slug: true },
    }),
  ]);

  return ok({
    artist: {
      id: artist.id,
      slug: artist.slug,
      displayName: artist.displayName,
      tagline: artist.tagline,
      bio: artist.bio,
      city: artist.city,
      country: artist.country,
      genres: artist.genres,
      // Private fields are returned to the owner of the backoffice only —
      // this endpoint is behind requireArtistAccess — and never enter a snapshot.
      realName: artist.realName,
      contactEmail: artist.contactEmail,
      contactPhone: artist.contactPhone,
      plan: artist.plan,
      muskaId: artist.muskaId,
    },
    draft: {
      templateId: draft.templateId,
      themeMode: draft.themeMode,
      background: draft.background,
      textColor: draft.textColor,
      accent: draft.accent,
      heroMediaId: draft.heroMediaId,
      portraitMediaId: draft.portraitMediaId,
      logoMediaId: draft.logoMediaId,
      editorOrder: readEditorOrder(draft.editorOrder),
      sections: readSections(draft.sections),
      version: draft.version,
      updatedAt: draft.updatedAt.toISOString(),
    },
    entitlement,
    published,
    palette: evaluatePalette({
      background: draft.background,
      text: draft.textColor,
      accent: draft.accent,
    }),
  });
});

export const PUT = handle(async (request: Request, { params }: Params) => {
  const { id } = await params;
  await requireArtistAccess(id, { write: true });

  const body = await readJson(request);
  const current = await db.pageDraft.findUnique({ where: { artistId: id } });
  if (!current) throw new ApiError("Rascunho não encontrado.", 404, "not_found");

  // Optimistic concurrency. Two tabs editing the same draft must not silently
  // overwrite each other (doc 03: "controlo de versão/conflito").
  if (typeof body.version === "number" && body.version !== current.version) {
    throw new ApiError(
      "O rascunho foi alterado noutro separador ou dispositivo. Recarrega antes de guardar.",
      409,
      "version_conflict",
      { expected: current.version, received: body.version },
    );
  }

  const entitlement = await getArtistEntitlement(id);

  // --- Artist profile --------------------------------------------------------

  const profile = (body.artist ?? {}) as Record<string, unknown>;
  const artistData: Record<string, unknown> = {};

  if (profile.displayName !== undefined) {
    artistData.displayName = requireString(profile, "displayName", { max: 80 });
  }
  if (profile.slug !== undefined) {
    const slug = assertSlug(String(profile.slug).trim().toLowerCase());
    const taken = await db.artist.findFirst({ where: { slug, NOT: { id } }, select: { id: true } });
    if (taken) throw new ApiError("Este endereço já está a ser usado.", 409, "slug_taken");
    artistData.slug = slug;
  }
  for (const field of ["tagline", "city", "country", "genres", "realName", "contactEmail", "contactPhone"] as const) {
    if (profile[field] !== undefined) artistData[field] = optionalString(profile, field, 240);
  }
  if (profile.bio !== undefined) {
    const bio = optionalString(profile, "bio", 6000);
    artistData.bio = bio ? cleanText(bio, 6000) : null;
  }

  // --- Appearance ------------------------------------------------------------

  const draftInput = (body.draft ?? {}) as Record<string, unknown>;
  const draftData: Record<string, unknown> = {};

  if (draftInput.templateId !== undefined) {
    const templateId = String(draftInput.templateId);
    if (!/^0[1-5]$/.test(templateId)) {
      throw new ApiError("Template desconhecido.", 400, "invalid_template");
    }
    // Doc 04: "não perde dados ao trocar template" — only templateId changes;
    // colours, images, sections and content selection are untouched.
    if (!entitlement.allowedTemplates.includes(templateId)) {
      throw new ApiError(
        `O template ${templateId} não está incluído no plano ${entitlement.label}.`,
        402,
        "plan_required",
      );
    }
    draftData.templateId = templateId;
  }

  if (draftInput.themeMode !== undefined) {
    const mode = String(draftInput.themeMode);
    if (!["dark", "light", "system"].includes(mode)) {
      throw new ApiError("Tema inválido.", 400, "invalid_theme");
    }
    draftData.themeMode = mode;
  }

  const colourFields = [
    ["background", "background"],
    ["textColor", "textColor"],
    ["accent", "accent"],
  ] as const;

  for (const [input, column] of colourFields) {
    if (draftInput[input] !== undefined) {
      const hex = normaliseHex(String(draftInput[input]));
      if (!hex) throw new ApiError(`Cor inválida em ${input}. Usa HEX com seis dígitos.`, 400, "invalid_color");
      draftData[column] = hex;
    }
  }

  // Reject an unreadable combination at write time, as the prototype does.
  const candidate = {
    background: (draftData.background as string) ?? current.background,
    text: (draftData.textColor as string) ?? current.textColor,
    accent: (draftData.accent as string) ?? current.accent,
  };
  const report = evaluatePalette(candidate);
  if (!report.valid) {
    throw new ApiError(
      "Combinação recusada: o texto precisa de 4,5:1 e o destaque de 3:1 de contraste com o fundo.",
      422,
      "insufficient_contrast",
      { checks: report.blocking },
    );
  }

  // --- Image references ------------------------------------------------------

  for (const field of ["heroMediaId", "portraitMediaId", "logoMediaId"] as const) {
    if (draftInput[field] === undefined) continue;
    const value = draftInput[field];
    if (value === null || value === "") {
      draftData[field] = null;
      continue;
    }
    const mediaId = String(value);
    // Cross-artist guard: an id belonging to someone else must not attach here.
    const media = await db.media.findFirst({
      where: { id: mediaId, artistId: id, kind: "image" },
      select: { id: true },
    });
    if (!media) throw new ApiError("Imagem não encontrada na biblioteca deste artista.", 404, "media_not_found");
    draftData[field] = mediaId;
  }

  // --- Order and sections ----------------------------------------------------

  if (draftInput.editorOrder !== undefined) {
    draftData.editorOrder = JSON.stringify(normaliseEditorOrder(draftInput.editorOrder));
  }
  if (draftInput.sections !== undefined) {
    const sections = normaliseSections(draftInput.sections);
    // Content ids are validated against what the artist actually owns, so a
    // crafted payload cannot pull another artist's media into a page.
    const ids = sections.flatMap((s) => s.contentIds);
    if (ids.length) {
      const [media, events, links] = await Promise.all([
        db.media.findMany({ where: { id: { in: ids }, artistId: id }, select: { id: true } }),
        db.event.findMany({ where: { id: { in: ids }, artistId: id }, select: { id: true } }),
        db.externalLink.findMany({ where: { id: { in: ids }, artistId: id }, select: { id: true } }),
      ]);
      const owned = new Set([...media, ...events, ...links].map((row) => row.id));
      for (const section of sections) {
        section.contentIds = section.contentIds.filter((contentId) => owned.has(contentId));
      }
    }
    draftData.sections = JSON.stringify(sections);
  }

  // --- Persist ---------------------------------------------------------------

  const [, draft] = await db.$transaction([
    db.artist.update({ where: { id }, data: artistData }),
    db.pageDraft.update({
      where: { artistId: id },
      data: { ...draftData, version: { increment: 1 } },
    }),
  ]);

  return ok({
    saved: true,
    version: draft.version,
    updatedAt: draft.updatedAt.toISOString(),
    palette: report,
  });
});
