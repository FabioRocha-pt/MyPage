import { db } from "./db";
import type { PageSnapshot } from "./page-model";

/**
 * The live snapshot for a slug, or null. Shared by the public page and its
 * booking page so both read the published version only (doc 03: "público lê
 * exclusivamente a versão publicada").
 */
export async function loadPublishedSnapshot(slug: string): Promise<PageSnapshot | null> {
  const published = await db.publishedPage.findFirst({
    where: { slug: slug.toLowerCase(), isLive: true },
    select: { snapshot: true },
  });
  if (!published) return null;
  try {
    return JSON.parse(published.snapshot) as PageSnapshot;
  } catch {
    return null;
  }
}
