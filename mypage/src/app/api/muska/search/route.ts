import { requireAccount } from "@/lib/auth";
import { fail, handle, ok } from "@/lib/api";
import { MuskaUnavailableError, getMuskaAdapter } from "@/lib/muska";

/**
 * Muska artist search.
 *
 * Doc 02: "Pesquisa do protótipo apenas informa que a API está pendente."
 * Doc 04, checklist item 8: "pesquisa Muska informa integração pendente."
 *
 * Until the adapter is implemented this returns 503 with the adapter's own
 * message, so the UI never implies that a search happened or that an artist was
 * associated.
 */
export const GET = handle(async (request: Request) => {
  await requireAccount();

  const url = new URL(request.url);
  const query = (url.searchParams.get("q") ?? "").trim();
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1) || 1);

  const adapter = getMuskaAdapter();
  const status = adapter.status();

  if (!status.connected) {
    return fail(status.message, 503, "integration_pending", { connected: false });
  }

  if (query.length < 2) {
    return ok({ items: [], total: 0, page, perPage: 24, connected: true });
  }

  try {
    const result = await adapter.searchArtists(query, page);
    return ok({ ...result, connected: true });
  } catch (error) {
    if (error instanceof MuskaUnavailableError) {
      return fail(error.message, 503, "integration_pending", { connected: false });
    }
    throw error;
  }
});
