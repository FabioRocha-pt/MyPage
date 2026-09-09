import { listManagedArtists, requireAccount } from "@/lib/auth";
import { getArtistEntitlement, getUsage } from "@/lib/entitlements";
import { handle, ok } from "@/lib/api";
import { getMuskaAdapter } from "@/lib/muska";

/** Doc 03: "Identidade/permissões | GET /me, lista de artistas geridos". */
export const GET = handle(async () => {
  const account = await requireAccount();
  const artists = await listManagedArtists(account.id);

  const enriched = await Promise.all(
    artists.map(async (artist) => {
      const [entitlement, usage] = await Promise.all([
        getArtistEntitlement(artist.id),
        getUsage(artist.id),
      ]);
      return { ...artist, entitlement, usage };
    }),
  );

  return ok({
    account,
    artists: enriched,
    integrations: { muska: getMuskaAdapter().status() },
  });
});
