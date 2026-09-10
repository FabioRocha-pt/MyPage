import { db } from "@/lib/db";
import { getAccount, getCurrentArtistId } from "@/lib/auth";
import {
  ApiError,
  clientKey,
  handle,
  ok,
  optionalString,
  paged,
  pagination,
  rateLimit,
  readJson,
  requireString,
} from "@/lib/api";
import { notify } from "@/lib/notify";

/**
 * Tool requests, from the landing page or from inside the backoffice.
 *
 * Doc 01: "Secção de pedido de ferramenta abaixo do toolkit: nome, descrição,
 * referências/anexos e contacto quando não autenticado. Dentro do backoffice,
 * não pedir novamente email/telefone: usar a conta autenticada."
 *
 * That distinction is enforced here: an authenticated request ignores any
 * contact fields in the payload and takes them from the session instead.
 */

export const POST = handle(async (request: Request) => {
  rateLimit(clientKey(request, "toolrequest"), 5, 30 * 60 * 1000);

  const body = await readJson(request);
  const title = requireString(body, "title", { max: 160 });
  const description = requireString(body, "description", { max: 4000 });

  const account = await getAccount();

  let contactEmail: string | null = null;
  let contactPhone: string | null = null;
  let artistId: string | null = null;

  if (account) {
    // Contact comes from the account; the form does not ask again.
    artistId = await getCurrentArtistId(account.id);
  } else {
    contactEmail = requireString(body, "contactEmail", { max: 200 }).toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contactEmail)) {
      throw new ApiError("Email inválido.", 400, "invalid_email");
    }
    contactPhone = optionalString(body, "contactPhone", 40);
  }

  // Attachments are media ids the artist already uploaded; anonymous requests
  // cannot attach files, since there is no owner to store them against.
  let attachments: string[] = [];
  if (account && artistId && Array.isArray(body.attachments)) {
    const ids = body.attachments.filter((id: unknown): id is string => typeof id === "string").slice(0, 10);
    if (ids.length) {
      const owned = await db.media.findMany({
        where: { id: { in: ids }, artistId },
        select: { id: true },
      });
      attachments = owned.map((m) => m.id);
    }
  }

  const created = await db.toolRequest.create({
    data: {
      accountId: account?.id ?? null,
      artistId,
      title,
      description,
      contactEmail,
      contactPhone,
      attachments: JSON.stringify(attachments),
      status: "new",
    },
  });

  await notify({
    artistId,
    dedupeKey: `tool.created:${created.id}`,
    type: "tool.created",
    title: "Pedido de ferramenta registado",
    body: `"${title}" foi enviado à equipa My Page.`,
    // The accordion inside the Page editor: the submenu dropped the standalone
    // /studio/tools entry when tool requests moved into the editor.
    href: "/studio/page#tools",
  });

  return ok(
    {
      id: created.id,
      received: true,
      message: account
        ? "Pedido registado. A equipa responde através dos contactos da tua conta."
        : "Pedido registado. A equipa entra em contacto pelo email indicado.",
    },
    { status: 201 },
  );
});

/** The requester's own history. */
export const GET = handle(async (request: Request) => {
  const account = await getAccount();
  if (!account) throw new ApiError("Sessão inválida.", 401, "unauthorized");

  const page = pagination(request, { defaultPerPage: 20 });
  const where = { accountId: account.id };

  const [items, total] = await Promise.all([
    db.toolRequest.findMany({ where, orderBy: { createdAt: "desc" }, take: page.take, skip: page.skip }),
    db.toolRequest.count({ where }),
  ]);

  return ok(
    paged(
      items.map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        status: item.status,
        reply: item.reply,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      })),
      total,
      page,
    ),
  );
});
