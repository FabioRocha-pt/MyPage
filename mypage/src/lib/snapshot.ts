import { db } from "./db";
import { evaluatePalette, repairPalette } from "./colors";
import { getPlatform, resolveEmbed } from "./platforms";
import {
  DEFAULT_EDITOR_ORDER,
  DEFAULT_SECTIONS,
  normaliseEditorOrder,
  normaliseSections,
  sectionMeta,
  type PageSnapshot,
  type SnapshotContent,
  type Section,
  type SnapshotAlbum,
  type SnapshotCampaign,
  type SnapshotEvent,
  type SnapshotImage,
  type SnapshotLink,
  type SnapshotProduct,
  type SnapshotTrack,
  type SnapshotVideo,
} from "./page-model";
import { getEntitlement } from "./entitlements";
import { readContent, youtubeId, youtubeThumbnail } from "./page-content";

/**
 * Builds the public snapshot from the draft.
 *
 * Doc 03: "Não copiar dados privados para snapshots públicos." Nothing on the
 * Artist record marked private (realName, contactEmail, contactPhone,
 * privateNotes) is read here. Availability private notes, booking requests and
 * order data are likewise absent by construction — a reviewer can verify the
 * rule by checking which `select` clauses this file uses.
 *
 * The same builder serves the authenticated preview and the publish step, so
 * doc 04's criterion "texto/foto/ordem alterados no backoffice aparecem no
 * preview" is satisfied by construction: preview and published output cannot
 * drift because they are the same function.
 */

export interface BuildOptions {
  /** Preview includes sections a plan has not unlocked, flagged as locked. */
  mode: "preview" | "publish";
}

export interface BuildResult {
  snapshot: PageSnapshot;
  /** Non-fatal problems worth showing in the editor before publishing. */
  warnings: string[];
  /** Problems that must be fixed before publish is allowed. */
  errors: string[];
}

function mediaUrl(id: string, variant: "view" | "download" = "view"): string {
  return `/api/media/${id}/${variant}`;
}

function toImage(
  media: { id: string; title: string; width: number | null; height: number | null } | null | undefined,
): SnapshotImage | null {
  if (!media) return null;
  return {
    mediaId: media.id,
    url: mediaUrl(media.id),
    width: media.width,
    height: media.height,
    alt: media.title,
  };
}

export async function buildSnapshot(artistId: string, options: BuildOptions): Promise<BuildResult> {
  const warnings: string[] = [];
  const errors: string[] = [];

  const artist = await db.artist.findUnique({
    where: { id: artistId },
    // Explicit select: private columns are never loaded into this scope.
    select: {
      id: true,
      slug: true,
      displayName: true,
      tagline: true,
      bio: true,
      city: true,
      country: true,
      genres: true,
      plan: true,
      draft: true,
    },
  });

  if (!artist) throw new Error("Artista não encontrado.");
  if (!artist.draft) throw new Error("Este artista ainda não tem rascunho.");

  const draft = artist.draft;
  const entitlement = await getEntitlement(artist.plan);

  // --- Appearance ------------------------------------------------------------

  const requested = {
    background: draft.background,
    text: draft.textColor,
    accent: draft.accent,
  };
  const report = evaluatePalette(requested);
  let palette = requested;
  if (!report.valid) {
    // Publishing an illegible page is not acceptable; repair and warn rather
    // than block, so a colour mistake cannot strand a page mid-launch.
    palette = repairPalette(requested);
    warnings.push(
      "A paleta guardada não cumpria os mínimos de contraste. Foram aplicadas cores corrigidas na versão publicada.",
    );
  }
  const derived = evaluatePalette(palette).derived;

  // --- Template --------------------------------------------------------------

  let templateId = draft.templateId;
  if (!entitlement.allowedTemplates.includes(templateId)) {
    if (options.mode === "publish") {
      errors.push(
        `O template ${templateId} não está disponível no plano ${entitlement.label}. Escolhe um template incluído no plano.`,
      );
    } else {
      warnings.push(`Pré-visualização com o template ${templateId}, que o plano ${entitlement.label} ainda não inclui.`);
    }
    templateId = entitlement.allowedTemplates[0] ?? "01";
  }

  // --- Sections --------------------------------------------------------------

  const sections: Section[] = draft.sections ? normaliseSections(safeJson(draft.sections)) : DEFAULT_SECTIONS;

  // A section whose tool the plan does not include is silently disabled on
  // publish. Doc 02: activation "deve depender da disponibilidade real e dos
  // direitos do plano, não apenas de uma checkbox."
  const effectiveSections = sections.map((section) => {
    const tool = sectionMeta(section.id).tool;
    if (tool && section.enabled && !entitlement.tools.includes(tool)) {
      warnings.push(`A secção "${section.id}" está desativada: não está incluída no plano ${entitlement.label}.`);
      return { ...section, enabled: false };
    }
    return section;
  });

  const enabled = new Set(effectiveSections.filter((s) => s.enabled).map((s) => s.id));
  const selectedIds = new Map(effectiveSections.map((s) => [s.id, new Set(s.contentIds)]));

  // --- Images ----------------------------------------------------------------

  const imageIds = [draft.heroMediaId, draft.portraitMediaId, draft.logoMediaId].filter(
    (id): id is string => Boolean(id),
  );
  const imageRecords = imageIds.length
    ? await db.media.findMany({
        where: { id: { in: imageIds }, artistId, kind: "image", status: "ready" },
        select: { id: true, title: true, width: true, height: true },
      })
    : [];
  const imageById = new Map(imageRecords.map((m) => [m.id, m]));

  const images = {
    hero: toImage(draft.heroMediaId ? imageById.get(draft.heroMediaId) : null),
    portrait: toImage(draft.portraitMediaId ? imageById.get(draft.portraitMediaId) : null),
    logo: toImage(draft.logoMediaId ? imageById.get(draft.logoMediaId) : null),
  };

  if (!images.hero && !images.portrait) {
    warnings.push("A página não tem banner nem retrato. Os templates vão usar apenas cor.");
  }

  // --- Links -----------------------------------------------------------------

  const linkRows = await db.externalLink.findMany({
    where: { artistId },
    orderBy: [{ group: "asc" }, { position: "asc" }],
  });

  const links: SnapshotLink[] = linkRows
    .filter((row) => row.group === "social")
    .map((row) => {
      const platform = getPlatform(row.platform);
      return {
        platform: row.platform,
        label: row.label ?? platform?.label ?? row.platform,
        mark: platform?.mark ?? "··",
        url: row.url,
        placement: row.placement as SnapshotLink["placement"],
      };
    });

  // --- Music -----------------------------------------------------------------

  const musicSelection = selectedIds.get("music") ?? new Set<string>();
  const audioRows = enabled.has("music")
    ? await db.media.findMany({
        where: { artistId, kind: "audio", status: "ready" },
        orderBy: { position: "asc" },
      })
    : [];

  const musicLinkRows = enabled.has("music")
    ? linkRows.filter((row) => row.group === "music")
    : [];

  const tracks: SnapshotTrack[] = [
    ...audioRows
      .filter((row) => musicSelection.has(row.id))
      .map<SnapshotTrack>((row) => {
        const platform = row.platform ? getPlatform(row.platform) : undefined;
        const embed = row.externalUrl ? resolveEmbed(row.externalUrl) : null;
        return {
          id: row.id,
          title: row.title,
          platform: row.platform,
          platformLabel: platform?.label ?? null,
          mark: platform?.mark ?? null,
          url: row.externalUrl,
          embed: embed ? { src: embed.src, ratio: embed.ratio, height: embed.height } : null,
          // A private file stays private even when its section is public.
          fileUrl: row.originalKey && row.isPublic ? mediaUrl(row.id) : null,
          placement: row.placement as SnapshotTrack["placement"],
        };
      }),
    ...musicLinkRows.map<SnapshotTrack>((row) => {
      const platform = getPlatform(row.platform);
      const embed = resolveEmbed(row.url);
      return {
        id: row.id,
        title: row.label ?? platform?.label ?? row.platform,
        platform: row.platform,
        platformLabel: platform?.label ?? null,
        mark: platform?.mark ?? null,
        url: row.url,
        embed: embed ? { src: embed.src, ratio: embed.ratio, height: embed.height } : null,
        fileUrl: null,
        placement: row.placement as SnapshotTrack["placement"],
      };
    }),
  ];

  // --- Video -----------------------------------------------------------------

  const videoSelection = selectedIds.get("video") ?? new Set<string>();
  const videoRows = enabled.has("video")
    ? await db.media.findMany({
        where: { artistId, kind: "video", status: "ready" },
        orderBy: { position: "asc" },
      })
    : [];

  const videos: SnapshotVideo[] = videoRows
    .filter((row) => videoSelection.has(row.id))
    .map((row) => {
      const embed = row.externalUrl ? resolveEmbed(row.externalUrl) : null;
      return {
        id: row.id,
        title: row.title,
        platform: row.platform,
        url: row.externalUrl,
        embed: embed ? { src: embed.src, ratio: embed.ratio, height: embed.height } : null,
        fileUrl: row.originalKey && row.isPublic ? mediaUrl(row.id) : null,
        poster: row.derivedKey ? mediaUrl(row.id) : null,
      };
    });

  // --- Events ----------------------------------------------------------------

  const eventSelection = selectedIds.get("events") ?? new Set<string>();
  const eventRows = enabled.has("events")
    ? await db.event.findMany({
        where: { artistId, isArchived: false },
        orderBy: { startsAt: "asc" },
      })
    : [];

  const posterIds = eventRows.map((e) => e.posterMediaId).filter((id): id is string => Boolean(id));
  const posterRows = posterIds.length
    ? await db.media.findMany({ where: { id: { in: posterIds }, artistId }, select: { id: true } })
    : [];
  const posterSet = new Set(posterRows.map((p) => p.id));

  const events: SnapshotEvent[] = eventRows
    // An empty selection means "show all upcoming"; a non-empty one is explicit.
    .filter((row) => eventSelection.size === 0 || eventSelection.has(row.id))
    .map((row) => ({
      id: row.id,
      title: row.title,
      startsAt: row.startsAt.toISOString(),
      timezone: row.timezone,
      venue: row.venue,
      city: row.city,
      country: row.country,
      description: row.description,
      ticketsUrl: row.ticketsUrl,
      poster:
        row.posterMediaId && posterSet.has(row.posterMediaId)
          ? mediaUrl(row.posterMediaId)
          : row.posterUrl,
    }));

  // --- Press kit -------------------------------------------------------------

  let press: { albums: SnapshotAlbum[]; links: PageSnapshot["press"]["links"] } = { albums: [], links: [] };

  if (enabled.has("press")) {
    const albumRows = await db.album.findMany({
      where: { artistId, isPublic: true },
      orderBy: { position: "asc" },
      include: {
        media: {
          // Doc 02: "Um ficheiro só será público se o álbum e o próprio
          // ficheiro estiverem ativos."
          where: { isPublic: true, status: "ready" },
          orderBy: { position: "asc" },
        },
      },
    });

    press.albums = albumRows.map((album) => ({
      id: album.id,
      name: album.name,
      category: album.category,
      items: album.media.map((item) => ({
        id: item.id,
        title: item.title,
        kind: item.kind,
        url: mediaUrl(item.id),
        // Original download is authorised separately; the link is only offered
        // for items that actually have a stored original.
        downloadUrl: item.originalKey ? mediaUrl(item.id, "download") : null,
      })),
    }));

    const pressLinkRows = await db.pressLink.findMany({ where: { artistId, isPublic: true } });
    press.links = pressLinkRows.map((row) => ({ category: row.category, url: row.url }));
  }

  // --- Booking ---------------------------------------------------------------

  const bookingEnabled = enabled.has("booking");
  const availabilityRows = bookingEnabled
    ? await db.availability.findMany({
        where: {
          artistId,
          endsAt: { gte: new Date() },
          // Expired provisional holds must not read as blocked.
          OR: [{ holdExpiresAt: null }, { holdExpiresAt: { gt: new Date() } }],
        },
        orderBy: { startsAt: "asc" },
        // privateNote deliberately excluded.
        select: { startsAt: true, endsAt: true, status: true },
        take: 400,
      })
    : [];

  const booking = {
    enabled: bookingEnabled,
    availability: availabilityRows.map((row) => ({
      start: row.startsAt.toISOString(),
      end: row.endsAt.toISOString(),
      status: row.status,
    })),
  };

  // --- Donations -------------------------------------------------------------

  let campaign: SnapshotCampaign | null = null;

  if (enabled.has("donations")) {
    const row = await db.campaign.findFirst({
      where: { artistId, status: "active", isPublic: true },
      orderBy: { createdAt: "desc" },
      include: {
        donations: {
          // Progress counts confirmed payments only (doc 02).
          where: { status: "confirmed" },
          orderBy: { confirmedAt: "desc" },
          take: 50,
        },
      },
    });

    if (row) {
      const raisedMinor = row.donations.reduce((total, d) => total + d.amountMinor, 0);
      const embed = row.videoUrl ? resolveEmbed(row.videoUrl) : null;
      campaign = {
        id: row.id,
        title: row.title,
        description: row.description,
        goalMinor: row.goalMinor,
        raisedMinor,
        currency: row.currency,
        videoUrl: row.videoUrl,
        videoEmbed: embed ? { src: embed.src, ratio: embed.ratio, height: embed.height } : null,
        donors: row.donations.map((d) => ({
          // Anonymity is honoured here, once, rather than at every render site.
          name: d.isAnonymous || !d.displayName ? "Anónimo" : d.displayName,
          amountMinor: d.amountMinor,
          message: d.message,
        })),
      };
    } else {
      warnings.push("A secção de donativos está ativa mas não existe campanha publicada.");
    }
  }

  // --- Store -----------------------------------------------------------------

  let products: SnapshotProduct[] = [];

  if (enabled.has("store")) {
    const productRows = await db.product.findMany({
      where: { artistId, isPublished: true },
      include: { variants: { orderBy: { position: "asc" } } },
      orderBy: { createdAt: "desc" },
    });

    products = productRows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      type: row.type as "digital" | "physical",
      image: row.imageMediaId ? mediaUrl(row.imageMediaId) : row.imageUrl,
      currency: row.currency,
      shippingMinor: row.shippingMinor,
      shippingInfo: row.shippingInfo,
      variants: row.variants.map((variant) => ({
        id: variant.id,
        name: variant.name,
        priceMinor: variant.priceMinor,
        stock: variant.stock,
      })),
      // assetMediaId is intentionally absent: a digital file must not be
      // discoverable before a verified payment (doc 04).
    }));

    if (products.length === 0) {
      warnings.push("A loja está ativa mas não existem produtos publicados.");
    }
  }

  // --- Structured content ------------------------------------------------------

  const content = readContent(draft.content);

  const contentImageIds = [
    ...content.bioPhotoIds,
    ...content.gallery.map((item) => item.mediaId),
    content.logoDarkMediaId,
    content.logoHeroMediaId,
    content.rider.diagramMediaId,
  ].filter((value): value is string => Boolean(value));

  // Only public images are published: the page is read anonymously, and a
  // private item would be a broken image for everyone but the owner.
  const contentImages = contentImageIds.length
    ? await db.media.findMany({
        where: { id: { in: contentImageIds }, artistId, kind: "image", status: "ready" },
        select: {
          id: true,
          title: true,
          width: true,
          height: true,
          isPublic: true,
          originalKey: true,
          album: { select: { isPublic: true } },
        },
      })
    : [];
  const publicImage = new Map(
    contentImages
      .filter((row) => row.isPublic && (row.album === null || row.album.isPublic))
      .map((row) => [row.id, row]),
  );
  const originalIsPublic = (mediaId: string) => {
    const row = publicImage.get(mediaId);
    return Boolean(row?.originalKey && row.album?.isPublic);
  };
  const contentImage = (mediaId: string | null) => (mediaId ? toImage(publicImage.get(mediaId)) : null);

  const privateCount = new Set(contentImageIds.filter((mediaId) => !publicImage.has(mediaId))).size;
  if (privateCount > 0) {
    warnings.push(
      `${privateCount} ${privateCount === 1 ? "fotografia escolhida é privada ou já não existe" : "fotografias escolhidas são privadas ou já não existem"} e não ${privateCount === 1 ? "aparece" : "aparecem"} na página. Torna-as públicas na biblioteca.`,
    );
  }

  const gallery = enabled.has("gallery")
    ? content.gallery.flatMap((item): SnapshotContent["gallery"] => {
        const mediaId = item.mediaId;
        if (!mediaId) {
          const videoId = youtubeId(item.videoUrl);
          if (!videoId) return [];
          const cover = { mediaId: "", url: youtubeThumbnail(videoId), width: 480, height: 360, alt: item.caption ?? "Vídeo" };
          return [{ image: cover, downloadUrl: null, caption: item.caption, credit: item.credit, videoId }];
        }
        const image = contentImage(mediaId);
        return image
          ? [
              {
                image,
                // The original is only downloadable from a public album (see the
                // download route); anywhere else the display derivative is offered.
                downloadUrl: mediaUrl(mediaId, originalIsPublic(mediaId) ? "download" : "view"),
                caption: item.caption,
                credit: item.credit,
                videoId: null,
              },
            ]
          : [];
      })
    : [];

  const highlights = enabled.has("highlights")
    ? content.highlights.map((item) => {
        const videoId = youtubeId(item.videoUrl);
        return {
          title: item.title,
          detail: item.detail,
          type: item.type,
          year: item.year,
          videoId,
          image: videoId ? youtubeThumbnail(videoId) : null,
        };
      })
    : [];

  // Documents come from the press kit, so they follow the press tool and the
  // album/file visibility rule instead of a second switch.
  const documents: SnapshotContent["documents"] = { presskit: null, rider: null, folder: null };
  if (entitlement.tools.includes("press")) {
    const documentRows = await db.media.findMany({
      where: {
        artistId,
        kind: "document",
        status: "ready",
        isPublic: true,
        album: { isPublic: true, category: { in: ["epk", "tech-rider", "hospitality-rider"] } },
      },
      orderBy: { position: "asc" },
      select: { id: true, album: { select: { category: true } } },
    });
    const firstIn = (...categories: string[]) =>
      documentRows.find((row) => row.album && categories.includes(row.album.category));
    const presskit = firstIn("epk");
    const riderDoc = firstIn("tech-rider", "hospitality-rider");
    documents.presskit = presskit ? mediaUrl(presskit.id, "download") : null;
    documents.rider = riderDoc ? mediaUrl(riderDoc.id, "download") : null;

    const folders = await db.pressLink.findMany({ where: { artistId, isPublic: true }, select: { category: true, url: true } });
    documents.folder = (folders.find((row) => row.category === "epk") ?? folders[0])?.url ?? null;
  }

  const bookingContact =
    content.booking.showPublic && (content.booking.phone || content.booking.email)
      ? {
          name: content.booking.contactName,
          role: content.booking.contactRole,
          phone: content.booking.phone,
          email: content.booking.email,
          whatsapp: content.booking.whatsapp && Boolean(content.booking.phone),
        }
      : null;

  const rider =
    content.rider.isPublic && (content.rider.technical.length || content.rider.hospitality.length)
      ? {
          technical: content.rider.technical,
          notes: content.rider.notes,
          diagram: contentImage(content.rider.diagramMediaId),
          diagramCaption: content.rider.diagramCaption,
          hospitality: content.rider.hospitality,
          guestTickets: content.rider.guestTickets,
          notices: content.rider.notices,
        }
      : null;

  const snapshotContent: SnapshotContent = {
    roleLine: content.roleLine,
    nickname: content.nickname,
    bioMarks: content.bioMarks,
    bioPhotos: content.bioPhotoIds
      .map((mediaId) => contentImage(mediaId))
      .filter((image): image is SnapshotImage => Boolean(image)),
    stats: content.stats,
    discography: enabled.has("music") ? content.discography : [],
    highlights,
    gallery,
    logoDark: contentImage(content.logoDarkMediaId),
    logoHero: contentImage(content.logoHeroMediaId),
    bookingContact,
    rider,
    documents,
  };

  // --- Assemble --------------------------------------------------------------

  const snapshot: PageSnapshot = {
    version: draft.version,
    publishedAt: new Date().toISOString(),
    artistId: artist.id,
    slug: artist.slug,
    templateId,
    profile: {
      displayName: artist.displayName,
      tagline: artist.tagline,
      bio: artist.bio,
      city: artist.city,
      country: artist.country,
      genres: (artist.genres ?? "")
        .split(",")
        .map((g) => g.trim())
        .filter(Boolean),
    },
    appearance: {
      mode: draft.themeMode as "dark" | "light" | "system",
      background: palette.background,
      text: palette.text,
      accent: palette.accent,
      accentText: derived.accentText,
      accentHover: derived.accentHover,
      surface: derived.surface,
      surfaceRaised: derived.surfaceRaised,
      line: derived.line,
      muted: derived.muted,
      overlay: derived.overlay,
    },
    images,
    sections: effectiveSections,
    links,
    tracks,
    videos,
    events,
    press,
    booking,
    campaign,
    products,
    branding: { showMyPageBadge: !entitlement.removeBranding },
    content: snapshotContent,
  };

  if (!artist.displayName.trim()) {
    errors.push("A página precisa de um nome artístico antes de ser publicada.");
  }
  if (!artist.slug) {
    errors.push("A página precisa de um endereço (slug) antes de ser publicada.");
  }

  return { snapshot, warnings, errors };
}

function safeJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/** Reads the draft's editor order, filling in cards added since it was saved. */
export function readEditorOrder(stored: string): string[] {
  try {
    return normaliseEditorOrder(JSON.parse(stored));
  } catch {
    return [...DEFAULT_EDITOR_ORDER];
  }
}

export function readSections(stored: string): Section[] {
  try {
    return normaliseSections(JSON.parse(stored));
  } catch {
    return DEFAULT_SECTIONS.map((s) => ({ ...s }));
  }
}
