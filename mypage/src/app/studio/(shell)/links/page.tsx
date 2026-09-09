import type { Metadata } from "next";
import { LinksManager, type LinkRow } from "@/components/studio/LinksManager";
import { db } from "@/lib/db";
import { PLATFORMS, getPlatform, resolveEmbed } from "@/lib/platforms";
import { requireStudioContext } from "@/lib/studio";

export const metadata: Metadata = { title: "Ligações" };

export default async function LinksPage() {
  const { artist } = await requireStudioContext();

  const links = await db.externalLink.findMany({
    where: { artistId: artist.id },
    orderBy: [{ group: "asc" }, { position: "asc" }],
  });

  const rows: LinkRow[] = links.map((link) => {
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

  return (
    <LinksManager
      artistId={artist.id}
      initialLinks={rows}
      platforms={PLATFORMS.map((platform) => ({
        id: platform.id,
        label: platform.label,
        mark: platform.mark,
        group: platform.group,
      }))}
    />
  );
}
