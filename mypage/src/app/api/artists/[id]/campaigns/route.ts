import { db } from "@/lib/db";
import { requireArtistAccess } from "@/lib/auth";
import {
  ApiError,
  handle,
  ok,
  optionalString,
  readJson,
  requireBool,
  requireEnum,
  requireInt,
  requireString,
} from "@/lib/api";
import { assertTool, getArtistEntitlement } from "@/lib/entitlements";
import { isCurrency } from "@/lib/money";
import { normaliseUrl, resolveEmbed } from "@/lib/platforms";

interface Params {
  params: Promise<{ id: string }>;
}

export const GET = handle(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  await requireArtistAccess(id);

  const campaigns = await db.campaign.findMany({
    where: { artistId: id },
    orderBy: { createdAt: "desc" },
    include: {
      donations: { select: { amountMinor: true, status: true } },
    },
  });

  return ok({
    campaigns: campaigns.map((campaign) => {
      const confirmed = campaign.donations.filter((d) => d.status === "confirmed");
      const pending = campaign.donations.filter((d) => d.status === "pending");
      const refunded = campaign.donations.filter((d) => d.status === "refunded");
      return {
        id: campaign.id,
        title: campaign.title,
        description: campaign.description,
        goalMinor: campaign.goalMinor,
        currency: campaign.currency,
        videoUrl: campaign.videoUrl,
        videoMediaId: campaign.videoMediaId,
        status: campaign.status,
        isPublic: campaign.isPublic,
        // Only confirmed money counts as raised (doc 02).
        raisedMinor: confirmed.reduce((total, d) => total + d.amountMinor, 0),
        pendingMinor: pending.reduce((total, d) => total + d.amountMinor, 0),
        refundedMinor: refunded.reduce((total, d) => total + d.amountMinor, 0),
        donorCount: confirmed.length,
      };
    }),
  });
});

export const POST = handle(async (request: Request, { params }: Params) => {
  const { id } = await params;
  await requireArtistAccess(id, { write: true });
  assertTool(await getArtistEntitlement(id), "donations");

  const body = await readJson(request);
  const title = requireString(body, "title", { max: 160 });
  const description = requireString(body, "description", { max: 4000 });
  const goalMinor = requireInt(body, "goalMinor", { min: 1, max: 1_000_000_000_00 });
  const currency = optionalString(body, "currency", 3) ?? "CVE";
  if (!isCurrency(currency)) throw new ApiError("Moeda não suportada.", 400, "invalid_currency");

  const videoRaw = optionalString(body, "videoUrl", 2000);
  let videoUrl: string | null = null;
  if (videoRaw) {
    videoUrl = normaliseUrl(videoRaw);
    if (!videoUrl || !resolveEmbed(videoUrl)) {
      throw new ApiError("Usa um link YouTube ou Vimeo que possa ser incorporado.", 400, "invalid_url");
    }
  }

  let videoMediaId: string | null = null;
  if (typeof body.videoMediaId === "string" && body.videoMediaId) {
    const media = await db.media.findFirst({
      where: { id: body.videoMediaId, artistId: id, kind: "video" },
      select: { id: true },
    });
    if (!media) throw new ApiError("Vídeo não encontrado.", 404, "media_not_found");
    videoMediaId = media.id;
  }

  const status = requireEnum(body, "status", ["draft", "active", "paused", "closed"] as const);
  const isPublic = requireBool(body, "isPublic", false);

  if (status === "active" && isPublic) {
    // Only one live campaign at a time keeps the public page unambiguous.
    await db.campaign.updateMany({
      where: { artistId: id, status: "active", isPublic: true },
      data: { status: "paused" },
    });
  }

  const campaign = await db.campaign.create({
    data: { artistId: id, title, description, goalMinor, currency, videoUrl, videoMediaId, status, isPublic },
  });

  return ok({ id: campaign.id, title: campaign.title }, { status: 201 });
});
