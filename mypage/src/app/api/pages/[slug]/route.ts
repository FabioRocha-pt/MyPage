import { db } from "@/lib/db";
import { ApiError, handle, ok } from "@/lib/api";

/**
 * Doc 03: "Público | GET /pages/{slug} devolve só snapshot publicado."
 *
 * There is no branch in this handler that can reach a draft. The only table it
 * reads is PublishedPage, filtered on isLive.
 */

interface Params {
  params: Promise<{ slug: string }>;
}

export const GET = handle(async (_request: Request, { params }: Params) => {
  const { slug } = await params;

  const published = await db.publishedPage.findFirst({
    where: { slug: slug.toLowerCase(), isLive: true },
    select: { snapshot: true, publishedAt: true, version: true },
  });

  if (!published) {
    throw new ApiError("Página não encontrada ou ainda não publicada.", 404, "not_found");
  }

  return ok(
    {
      snapshot: JSON.parse(published.snapshot),
      publishedAt: published.publishedAt.toISOString(),
      version: published.version,
    },
    {
      headers: {
        // Published output is immutable per version; a short shared cache is safe.
        "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
      },
    },
  );
});
