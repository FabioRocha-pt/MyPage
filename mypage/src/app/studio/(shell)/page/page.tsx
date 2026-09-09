import type { Metadata } from "next";
import { PageEditor, type EditorAppearance, type EditorProfile } from "@/components/studio/PageEditor";
import { db } from "@/lib/db";
import { normaliseEditorOrder, normaliseSections } from "@/lib/page-model";
import { requireStudioContext } from "@/lib/studio";

export const metadata: Metadata = { title: "Page" };

/**
 * The editor screen.
 *
 * The draft is read here on the server rather than fetched from
 * /api/artists/{id}/page/draft: the API route exists for other clients, but a
 * server component reading through the same library avoids a round trip and a
 * loading state on first paint. Every write still goes through the API, so the
 * validation, plan checks and version conflict handling stay in one place.
 */
export default async function EditorPage() {
  const { artist, entitlement } = await requireStudioContext();

  const [draft, images, links, published] = await Promise.all([
    db.pageDraft.findUnique({ where: { artistId: artist.id } }),
    db.media.findMany({
      where: { artistId: artist.id, kind: "image", status: "ready" },
      orderBy: [{ position: "asc" }, { createdAt: "desc" }],
      select: { id: true, title: true },
      take: 200,
    }),
    db.externalLink.findMany({
      where: { artistId: artist.id },
      orderBy: [{ group: "asc" }, { position: "asc" }],
    }),
    db.publishedPage.findFirst({
      where: { artistId: artist.id, isLive: true },
      select: { version: true },
    }),
  ]);

  const record =
    draft ??
    (await db.pageDraft.create({
      data: { artistId: artist.id, editorOrder: "[]", sections: "[]" },
    }));

  const full = await db.artist.findUniqueOrThrow({ where: { id: artist.id } });

  const profile: EditorProfile = {
    displayName: full.displayName,
    slug: full.slug,
    tagline: full.tagline ?? "",
    bio: full.bio ?? "",
    city: full.city ?? "",
    country: full.country ?? "",
    genres: full.genres ?? "",
    realName: full.realName ?? "",
    contactEmail: full.contactEmail ?? "",
    contactPhone: full.contactPhone ?? "",
  };

  const appearance: EditorAppearance = {
    templateId: record.templateId,
    themeMode: record.themeMode as EditorAppearance["themeMode"],
    background: record.background,
    textColor: record.textColor,
    accent: record.accent,
    heroMediaId: record.heroMediaId,
    portraitMediaId: record.portraitMediaId,
    logoMediaId: record.logoMediaId,
  };

  return (
    <PageEditor
      artistId={artist.id}
      domain={process.env.PAGE_DOMAIN ?? "muska.cv"}
      entitlement={entitlement}
      initialProfile={profile}
      initialAppearance={appearance}
      initialEditorOrder={normaliseEditorOrder(safeParse(record.editorOrder))}
      initialSections={normaliseSections(safeParse(record.sections))}
      initialVersion={record.version}
      images={images.map((image) => ({
        id: image.id,
        title: image.title,
        viewUrl: `/api/media/${image.id}/view`,
      }))}
      links={links.map((link) => ({
        id: link.id,
        platformLabel: link.platform,
        mark: "··",
        label: link.label,
        url: link.url,
        group: link.group,
        placement: link.placement,
      }))}
      publishedVersion={published?.version ?? null}
    />
  );
}

function safeParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}
