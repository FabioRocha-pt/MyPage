import type { Metadata } from "next";
import { PressKitManager } from "@/components/studio/PressKitManager";
import { db } from "@/lib/db";
import { loadLibrary } from "@/lib/library";
import { PRESS_CATEGORIES } from "@/lib/press";
import { requireStudioContext } from "@/lib/studio";

export const metadata: Metadata = { title: "Press kit" };

export default async function PressPage() {
  const { artist, entitlement, usage } = await requireStudioContext();

  const [links, albums, images] = await Promise.all([
    db.pressLink.findMany({ where: { artistId: artist.id } }),
    db.album.findMany({
      where: { artistId: artist.id },
      orderBy: { position: "asc" },
      include: { _count: { select: { media: true } } },
    }),
    loadLibrary(artist.id, "image"),
  ]);

  const byCategory = new Map(links.map((link) => [link.category, link]));

  return (
    <PressKitManager
      artistId={artist.id}
      initialCategories={PRESS_CATEGORIES.map((category) => ({
        ...category,
        url: byCategory.get(category.id)?.url ?? "",
        isPublic: byCategory.get(category.id)?.isPublic ?? false,
      }))}
      initialAlbums={albums.map((album) => ({
        id: album.id,
        name: album.name,
        category: album.category,
        isPublic: album.isPublic,
        mediaCount: album._count.media,
      }))}
      images={images}
      usage={{
        used: usage.storageMb,
        limitMb: entitlement.maxStorageMb,
        items: usage.mediaItems,
        maxItems: entitlement.maxMediaItems,
      }}
    />
  );
}
