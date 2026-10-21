import type { Metadata } from "next";
import { MediaLibrary } from "@/components/studio/MediaLibrary";
import { load } from "@/lib/data";

export const metadata: Metadata = { title: "Vídeos" };

export default async function VideoPage() {
  const {
    context: { artist, entitlement, usage },
    items,
  } = await load.studioLibrary("video");

  return (
    <MediaLibrary
      artistId={artist.id}
      kind="video"
      title="Vídeos"
      intro="Liga vídeos do YouTube ou Vimeo, ou carrega ficheiros. A Page só escolhe quais entram."
      initialItems={items}
      allowLinks
      usage={{
        used: usage.storageMb,
        limitMb: entitlement.maxStorageMb,
        items: usage.mediaItems,
        maxItems: entitlement.maxMediaItems,
      }}
    />
  );
}
