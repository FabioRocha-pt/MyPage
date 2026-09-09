import { db } from "@/lib/db";
import { requireArtistAccess } from "@/lib/auth";
import { ApiError, handle, ok, optionalInt, optionalString, readJson, requireEnum } from "@/lib/api";
import { normaliseUrl, resolveEmbed } from "@/lib/platforms";

interface Params {
  params: Promise<{ id: string }>;
}

async function loadOwned(id: string) {
  const campaign = await db.campaign.findUnique({ where: { id } });
  if (!campaign) throw new ApiError("Campanha não encontrada.", 404, "not_found");
  await requireArtistAccess(campaign.artistId, { write: true });
  return campaign;
}

export const PATCH = handle(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const campaign = await loadOwned(id);
  const body = await readJson(request);

  const data: Record<string, unknown> = {};
  if (typeof body.title === "string" && body.title.trim()) data.title = body.title.trim().slice(0, 160);
  if (typeof body.description === "string") data.description = body.description.trim().slice(0, 4000);
  if (body.goalMinor !== undefined) {
    data.goalMinor = optionalInt(body, "goalMinor", { min: 1, max: 1_000_000_000_00 });
  }
  if (body.isPublic !== undefined) data.isPublic = body.isPublic === true;
  if (body.status !== undefined) {
    data.status = requireEnum(body, "status", ["draft", "active", "paused", "closed"] as const);
  }
  if (body.videoUrl !== undefined) {
    const raw = optionalString(body, "videoUrl", 2000);
    if (!raw) {
      data.videoUrl = null;
    } else {
      const url = normaliseUrl(raw);
      if (!url || !resolveEmbed(url)) {
        throw new ApiError("Usa um link YouTube ou Vimeo válido.", 400, "invalid_url");
      }
      data.videoUrl = url;
    }
  }

  if (data.status === "active" && (data.isPublic ?? campaign.isPublic)) {
    await db.campaign.updateMany({
      where: { artistId: campaign.artistId, status: "active", isPublic: true, NOT: { id } },
      data: { status: "paused" },
    });
  }

  const updated = await db.campaign.update({ where: { id }, data });
  return ok({ id: updated.id, status: updated.status, isPublic: updated.isPublic });
});

export const DELETE = handle(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  await loadOwned(id);

  const donations = await db.donation.count({ where: { campaignId: id, status: { in: ["confirmed", "refunded"] } } });
  if (donations > 0) {
    // Financial history is not deletable; close the campaign instead.
    await db.campaign.update({ where: { id }, data: { status: "closed", isPublic: false } });
    return ok({
      deleted: false,
      closed: true,
      message: "A campanha tem donativos registados, por isso foi encerrada em vez de apagada.",
    });
  }

  await db.campaign.delete({ where: { id } });
  return ok({ deleted: true });
});
