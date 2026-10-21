import type { Metadata } from "next";
import { PageEditor } from "@/components/studio/editor/PageEditor";
import type {
  EditorAppearance,
  EditorProfile,
  LinkRow,
  SelectableItem,
} from "@/components/studio/editor/types";
import { load } from "@/lib/data";
import { readContent } from "@/lib/page-content";
import { normaliseEditorOrder, normaliseSections } from "@/lib/page-model";
import { PLATFORMS, getPlatform, resolveEmbed } from "@/lib/platforms";
import { PRESS_CATEGORIES } from "@/lib/press";

export const metadata: Metadata = { title: "Page" };

/**
 * The editor screen.
 *
 * Everything the cards need is read here on the server through the same
 * libraries the API routes use, so the first paint has no loading state. Every
 * write still goes through the API, which keeps validation, plan checks and
 * version-conflict handling in one place.
 */
export default async function EditorPage() {
  const {
    context: { account, artist, entitlement },
    rows: [full, images, links, published, pressLinks, albums, audio, videos, events, toolRequests, attachments],
    record,
  } = await load.studioEditor();

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

  const linkRows: LinkRow[] = links.map((link) => {
    const platform = getPlatform(link.platform);
    return {
      id: link.id,
      platform: link.platform,
      platformLabel: platform?.label ?? link.platform,
      mark: platform?.mark ?? "··",
      label: link.label,
      url: link.url,
      group: link.group,
      placement: link.placement,
      embeddable: Boolean(resolveEmbed(link.url)),
    };
  });

  const byCategory = new Map(pressLinks.map((row) => [row.category, row]));

  const mediaItem = (row: { id: string; title: string; platform: string | null; externalUrl: string | null; isPublic: boolean }): SelectableItem => ({
    id: row.id,
    title: row.title,
    note: row.externalUrl
      ? `Link · ${getPlatform(row.platform ?? "")?.label ?? row.platform ?? "externo"}`
      : row.isPublic
        ? "Ficheiro público"
        : "Ficheiro privado — não é publicado enquanto estiver assim",
  });

  return (
    <PageEditor
      artistId={artist.id}
      domain={process.env.PAGE_DOMAIN ?? "muska.cv"}
      entitlement={entitlement}
      initialProfile={profile}
      initialAppearance={appearance}
      initialEditorOrder={normaliseEditorOrder(safeParse(record.editorOrder))}
      initialSections={normaliseSections(safeParse(record.sections))}
      initialContent={readContent(record.content)}
      initialVersion={record.version}
      images={images.map((image) => ({
        id: image.id,
        title: image.title,
        viewUrl: `/api/media/${image.id}/view`,
      }))}
      links={linkRows}
      platforms={PLATFORMS.map((p) => ({ id: p.id, label: p.label, mark: p.mark, group: p.group }))}
      pressCategories={PRESS_CATEGORIES.map((category) => ({
        ...category,
        url: byCategory.get(category.id)?.url ?? "",
        isPublic: byCategory.get(category.id)?.isPublic ?? false,
      }))}
      albums={albums.map((album) => ({
        id: album.id,
        name: album.name,
        category: album.category,
        isPublic: album.isPublic,
        mediaCount: album._count.media,
      }))}
      audio={audio.map(mediaItem)}
      videos={videos.map(mediaItem)}
      events={events.map((event) => ({
        id: event.id,
        title: event.title,
        note: `${new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium" }).format(event.startsAt)}${
          event.venue ? ` · ${event.venue}` : ""
        }`,
      }))}
      toolRequests={toolRequests.map((request) => ({
        id: request.id,
        title: request.title,
        description: request.description,
        status: request.status,
        reply: request.reply,
        createdAt: request.createdAt.toISOString(),
      }))}
      toolAttachments={attachments}
      contactEmail={account.email}
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
