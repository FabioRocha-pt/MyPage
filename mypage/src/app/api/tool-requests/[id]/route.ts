import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { ApiError, handle, ok, optionalEnum, optionalString, readJson } from "@/lib/api";
import { notify } from "@/lib/notify";

/**
 * Answering a tool request.
 *
 * Doc 03 lists the tool-request operation as "Criar pedido, listar
 * acompanhamento, responder pela equipa". The first two live in
 * `../route.ts`; this is the third, and it is the only write in the codebase
 * that no per-artist role can perform — replying is a platform action, so it is
 * gated on `requireStaff` rather than on `requireArtistAccess`.
 */

export const TOOL_REQUEST_STATUSES = [
  "new",
  "reviewing",
  "answered",
  "planned",
  "declined",
] as const;

export type ToolRequestStatus = (typeof TOOL_REQUEST_STATUSES)[number];

export const PATCH = handle(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireStaff();
  const { id } = await params;

  const existing = await db.toolRequest.findUnique({ where: { id } });
  if (!existing) throw new ApiError("Pedido não encontrado.", 404, "not_found");

  const body = await readJson(request);
  const status = optionalEnum(body, "status", TOOL_REQUEST_STATUSES, existing.status as ToolRequestStatus);
  const reply = body.reply === undefined ? existing.reply : optionalString(body, "reply", 4000);

  if (status === existing.status && reply === existing.reply) {
    throw new ApiError("Nada a alterar.", 400, "no_changes");
  }

  const updated = await db.toolRequest.update({
    where: { id },
    data: { status, reply },
  });

  // Tell the artist only when there is something new to read. The dedupe key
  // carries the reply's identity, so re-saving the same answer stays silent
  // while a corrected answer notifies again.
  const replyIsNew = Boolean(reply) && reply !== existing.reply;
  if (replyIsNew && existing.artistId) {
    await notify({
      artistId: existing.artistId,
      dedupeKey: `tool.answered:${id}:${hash(reply ?? "")}`,
      type: "tool.answered",
      title: "A equipa respondeu ao teu pedido",
      body: `"${existing.title}": ${(reply ?? "").slice(0, 200)}`,
      // Same destination as the `tool.created` notification in ../route.ts.
      // /studio/tools is no longer in the submenu but the route still renders
      // the artist's request history, reply included.
      href: "/studio/tools",
    });
  }

  return ok({
    id: updated.id,
    status: updated.status,
    reply: updated.reply,
    updatedAt: updated.updatedAt.toISOString(),
    /**
     * An anonymous landing-page request has no account to notify in-app. The
     * caller is told so it can fall back to the contact the visitor left.
     */
    notifiedInApp: replyIsNew && Boolean(existing.artistId),
    contactEmail: existing.contactEmail,
  });
});

/** Short, stable digest so an edited reply produces a different dedupe key. */
function hash(input: string): string {
  let value = 0;
  for (let index = 0; index < input.length; index += 1) {
    value = (value * 31 + input.charCodeAt(index)) | 0;
  }
  return Math.abs(value).toString(36);
}
