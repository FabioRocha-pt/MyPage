import type { Metadata } from "next";
import { ToolRequestsManager, type ToolRequestRow } from "@/components/studio/ToolRequestsManager";
import { db } from "@/lib/db";
import { requireStudioContext } from "@/lib/studio";

export const metadata: Metadata = { title: "Pedir ferramenta" };

export default async function ToolsPage() {
  const { account, artist } = await requireStudioContext();

  const [requests, attachments] = await Promise.all([
    db.toolRequest.findMany({ where: { accountId: account.id }, orderBy: { createdAt: "desc" }, take: 20 }),
    db.media.findMany({
      where: { artistId: artist.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true },
      take: 20,
    }),
  ]);

  const rows: ToolRequestRow[] = requests.map((request) => ({
    id: request.id,
    title: request.title,
    description: request.description,
    status: request.status,
    reply: request.reply,
    createdAt: request.createdAt.toISOString(),
  }));

  return (
    <ToolRequestsManager contactEmail={account.email} attachments={attachments} initialRequests={rows} />
  );
}
