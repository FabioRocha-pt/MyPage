import { requireArtistAccess } from "@/lib/auth";
import { handle, ok, readJson } from "@/lib/api";
import { listNotifications, markRead } from "@/lib/notify";

interface Params {
  params: Promise<{ id: string }>;
}

export const GET = handle(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  await requireArtistAccess(id);

  const notifications = await listNotifications(id, 30);
  return ok({
    notifications: notifications.map((row) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      body: row.body,
      href: row.href,
      read: Boolean(row.readAt),
      createdAt: row.createdAt.toISOString(),
    })),
    unread: notifications.filter((row) => !row.readAt).length,
  });
});

export const POST = handle(async (request: Request, { params }: Params) => {
  const { id } = await params;
  await requireArtistAccess(id, { write: true });

  const body = await readJson(request);
  const ids = Array.isArray(body.ids) ? body.ids.filter((v: unknown): v is string => typeof v === "string") : [];
  const count = await markRead(id, ids);
  return ok({ read: count });
});
