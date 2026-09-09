import type { Metadata } from "next";
import { DonationsManager, type CampaignRow } from "@/components/studio/DonationsManager";
import { db } from "@/lib/db";
import { requireStudioContext } from "@/lib/studio";

export const metadata: Metadata = { title: "Donativos" };

export default async function DonationsPage() {
  const { artist, entitlement } = await requireStudioContext();

  const campaigns = await db.campaign.findMany({
    where: { artistId: artist.id },
    orderBy: { createdAt: "desc" },
    include: { donations: { select: { amountMinor: true, status: true } } },
  });

  const rows: CampaignRow[] = campaigns.map((campaign) => {
    const sum = (state: string) =>
      campaign.donations.filter((d) => d.status === state).reduce((total, d) => total + d.amountMinor, 0);

    return {
      id: campaign.id,
      title: campaign.title,
      description: campaign.description,
      goalMinor: campaign.goalMinor,
      currency: campaign.currency,
      videoUrl: campaign.videoUrl,
      status: campaign.status,
      isPublic: campaign.isPublic,
      raisedMinor: sum("confirmed"),
      pendingMinor: sum("pending"),
      refundedMinor: sum("refunded"),
      donorCount: campaign.donations.filter((d) => d.status === "confirmed").length,
    };
  });

  return (
    <DonationsManager
      artistId={artist.id}
      initialCampaigns={rows}
      // The mock provider is the default; only an explicitly configured SISP
      // integration counts as live.
      paymentsLive={(process.env.PAYMENT_PROVIDER ?? "mock") === "sisp"}
      included={entitlement.tools.includes("donations")}
      planLabel={entitlement.label}
    />
  );
}
