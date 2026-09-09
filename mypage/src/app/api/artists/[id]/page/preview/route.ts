import { requireArtistAccess } from "@/lib/auth";
import { handle, ok } from "@/lib/api";
import { buildSnapshot } from "@/lib/snapshot";

/**
 * Authenticated preview of the current draft.
 *
 * Doc 03: "Preview lê rascunho autorizado; público lê exclusivamente a versão
 * publicada." Doc 04 lists as a known limitation to fix: "Preview não é um
 * preview de rascunho real." It is now — this endpoint and the publish endpoint
 * call the same `buildSnapshot`.
 */

interface Params {
  params: Promise<{ id: string }>;
}

export const GET = handle(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  await requireArtistAccess(id);

  const { snapshot, warnings, errors } = await buildSnapshot(id, { mode: "preview" });
  return ok({ snapshot, warnings, errors, publishable: errors.length === 0 });
});
