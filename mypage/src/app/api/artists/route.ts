import { db } from "@/lib/db";
import { handle, ok, paged, pagination } from "@/lib/api";

/**
 * PUBLIC artist directory.
 *
 * Doc 01: "Deve existir uma listagem de artistas que trabalham com Muska/My
 * Page, alimentada pelo catálogo real, com pesquisa, imagens e paginação. A
 * página local atual contém apenas uma seleção demonstrativa, não o catálogo
 * completo."
 *
 * This lists artists with a published My Page — the part we own. The full Muska
 * catalogue arrives through the adapter once the API exists; the UI links out
 * to muskalive.com meanwhile.
 */
export const GET = handle(async (request: Request) => {
  const url = new URL(request.url);
  const query = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  const page = pagination(request, { defaultPerPage: 24 });

  // Only artists with a live published page are discoverable here.
  const where = {
    publishedPages: { some: { isLive: true } },
    ...(query
      ? {
          OR: [
            { displayName: { contains: query } },
            { city: { contains: query } },
            { genres: { contains: query } },
          ],
        }
      : {}),
  };

  const [artists, total] = await Promise.all([
    db.artist.findMany({
      where,
      orderBy: { displayName: "asc" },
      take: page.take,
      skip: page.skip,
      // Public projection only: no realName, no contact fields.
      select: {
        id: true,
        slug: true,
        displayName: true,
        tagline: true,
        city: true,
        country: true,
        genres: true,
        publishedPages: {
          where: { isLive: true },
          select: { snapshot: true, publishedAt: true },
          take: 1,
        },
      },
    }),
    db.artist.count({ where }),
  ]);

  const items = artists.map((artist) => {
    let image: string | null = null;
    let accent: string | null = null;
    try {
      const snapshot = JSON.parse(artist.publishedPages[0]?.snapshot ?? "{}");
      image = snapshot?.images?.portrait?.url ?? snapshot?.images?.hero?.url ?? null;
      accent = snapshot?.appearance?.accent ?? null;
    } catch {
      // A malformed snapshot must not take the directory down.
    }
    return {
      slug: artist.slug,
      displayName: artist.displayName,
      tagline: artist.tagline,
      city: artist.city,
      country: artist.country,
      genres: (artist.genres ?? "").split(",").map((g) => g.trim()).filter(Boolean),
      image,
      accent,
      url: `/p/${artist.slug}`,
    };
  });

  return ok(paged(items, total, page), {
    headers: { "Cache-Control": "public, max-age=60, s-maxage=300" },
  });
});
