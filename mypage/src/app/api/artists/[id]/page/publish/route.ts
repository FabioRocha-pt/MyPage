import { db } from "@/lib/db";
import { requireArtistAccess } from "@/lib/auth";
import { ApiError, handle, ok, readJson } from "@/lib/api";
import { buildSnapshot } from "@/lib/snapshot";

/**
 * Doc 03: "Preview/publicar | Preview autenticado; POST /artists/{id}/page/publish".
 * "Publicar deve ser atómico e permitir recuperar uma versão anterior."
 *
 * Atomicity: the new snapshot row and the demotion of the previous live row
 * happen in one transaction, so no request can ever observe two live versions
 * or none at all.
 *
 * Rollback: previous versions stay in the table with isLive=false. POST with
 * { restoreVersion: n } promotes one of them back.
 */

interface Params {
  params: Promise<{ id: string }>;
}

export const POST = handle(async (request: Request, { params }: Params) => {
  const { id } = await params;
  await requireArtistAccess(id, { write: true });

  const body = await readJson(request).catch(() => ({}) as Record<string, unknown>);

  // --- Restore a previous version -------------------------------------------

  if (typeof body.restoreVersion === "number") {
    const target = await db.publishedPage.findUnique({
      where: { artistId_version: { artistId: id, version: body.restoreVersion } },
    });
    if (!target) throw new ApiError("Versão não encontrada.", 404, "version_not_found");

    const latest = await db.publishedPage.findFirst({
      where: { artistId: id },
      orderBy: { version: "desc" },
      select: { version: true },
    });

    const restored = await db.$transaction(async (tx) => {
      await tx.publishedPage.updateMany({ where: { artistId: id, isLive: true }, data: { isLive: false } });
      // Republish the old snapshot under a new version number so history stays
      // append-only and the audit trail shows the rollback as an event.
      return tx.publishedPage.create({
        data: {
          artistId: id,
          slug: target.slug,
          snapshot: target.snapshot,
          version: (latest?.version ?? 0) + 1,
          isLive: true,
        },
      });
    });

    return ok({
      published: true,
      restoredFrom: body.restoreVersion,
      version: restored.version,
      slug: restored.slug,
      url: `/p/${restored.slug}`,
    });
  }

  // --- Publish the current draft --------------------------------------------

  const { snapshot, warnings, errors } = await buildSnapshot(id, { mode: "publish" });

  if (errors.length) {
    throw new ApiError(
      "A página não pode ser publicada enquanto houver erros por resolver.",
      422,
      "not_publishable",
      { errors, warnings },
    );
  }

  const latest = await db.publishedPage.findFirst({
    where: { artistId: id },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const version = (latest?.version ?? 0) + 1;

  const published = await db.$transaction(async (tx) => {
    await tx.publishedPage.updateMany({ where: { artistId: id, isLive: true }, data: { isLive: false } });
    return tx.publishedPage.create({
      data: {
        artistId: id,
        slug: snapshot.slug,
        snapshot: JSON.stringify({ ...snapshot, version }),
        version,
        isLive: true,
      },
    });
  });

  return ok({
    published: true,
    version: published.version,
    publishedAt: published.publishedAt.toISOString(),
    slug: published.slug,
    url: `/p/${published.slug}`,
    warnings,
  });
});

/** Version history, for the rollback UI. */
export const GET = handle(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  await requireArtistAccess(id);

  const versions = await db.publishedPage.findMany({
    where: { artistId: id },
    orderBy: { version: "desc" },
    take: 30,
    select: { version: true, publishedAt: true, slug: true, isLive: true },
  });

  return ok({ versions });
});
