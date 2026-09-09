import type { Metadata } from "next";
import { MediaLibrary } from "@/components/studio/MediaLibrary";
import { MuskaSearch } from "@/components/studio/MuskaSearch";
import { getMuskaAdapter } from "@/lib/muska";
import { loadLibrary } from "@/lib/library";
import { requireStudioContext } from "@/lib/studio";

export const metadata: Metadata = { title: "Áudio" };

export default async function AudioPage() {
  const { artist, entitlement, usage } = await requireStudioContext();
  const items = await loadLibrary(artist.id, "audio");
  const muska = getMuskaAdapter().status();

  return (
    <MediaLibrary
      artistId={artist.id}
      kind="audio"
      title="Áudio"
      intro="Sets, faixas e ligações a outras plataformas. Na Page escolhes quais aparecem."
      initialItems={items}
      allowLinks
      usage={{
        used: usage.storageMb,
        limitMb: entitlement.maxStorageMb,
        items: usage.mediaItems,
        maxItems: entitlement.maxMediaItems,
      }}
    >
      <MuskaSearch connected={muska.connected} message={muska.message} />
    </MediaLibrary>
  );
}
